import * as csv from 'csvtojson';
import * as storage from 'azure-storage';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as request from 'request';
import * as ttts from '@motionpicture/ttts-domain';
import * as mongooseConnectionOptions_1 from '../configs/mongooseConnectionOptions';
import * as configs from '../configs/app.js';
import * as moment from 'moment';
const posRepo = require("../models/posRepo.js");
const posEntity = require("../models/posEntity.js");
const Logs = require("../libs/logHelper");

//開発環境で使うだけ、本番でこれを使わない
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
    run({
        bindingData: {
            uri: 'https://tttsstorage.blob.core.windows.net/container4bi/working/pos-data.csv',
            name: 'pos-data.csv'
        },
        log: (text: string) => {
            console.log(text);
        }
    }, null);
}

//大切な機能
export async function run (context, myBlob) {
    context.log('---START---');

    const rows = [];
    try {
        //CSVの項目を読む
        const csvPath = `${__dirname}/../configs/CSV/101.csv.yml`;
        const header = Object.getOwnPropertyNames(yaml.safeLoad(fs.readFileSync(csvPath, 'utf8')));
        const fileInfo: any = request.get(context.bindingData.uri);
        
        //CSVのデータをStorageで読む
        await csv({noheader: true, output: "csv"})
        .fromStream(fileInfo)
        .then(docs => {
            if (configs.csv.csv_101.useHeader) {
                docs.shift();
            }
            docs.forEach (doc => {
                rows.push(doc);
            });
        });

        //PosSalesエンティティを作成
        const entities = await posRepo.getPosSales(header, rows);
        ttts.mongoose.connect(process.env.MONGOLAB_URI, mongooseConnectionOptions_1.default);
        
        for (var x in entities) {
            try {
                const conditions = [
                    { payment_no: entities[x].payment_no },
                    { seat_code: entities[x].seat_code },
                    { performance_day: entities[x].performance_day }
                ];
    
                const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
                const reservations = await reservationRepo.reservationModel.find({ $and: conditions })
                .exec()
                .then(docs => docs.map(doc => doc.toObject()));
    
                if (reservations.length != 1) continue;
                if (reservations[0].checkins.length >= 1) {
                    entities[x].entry_flg = 'TRUE';
                    entities[x].entry_date = reservations[0].checkins[0].when.toISOString();
                } else {
                    entities[x].entry_flg = 'FALSE';
                }
            } catch (error) {
                //Logファイルにバグを書く
                Logs.writeErrorLog(error.stack);
                return;
            }
        }
    
        ttts.mongoose.disconnect();
        await posRepo.insertPosSales(entities);
        await moveListFileWorking(context.bindingData);

    } catch (error) {
        Logs.writeErrorLog(error.stack);
        return;
    }

    context.log('---END---');
}

//全部ファイルを遷移
async function moveListFileWorking (fileReading) {
    const oriBlob = 'working/' + fileReading.name;
    const targetBlob = 'complete/' + fileReading.name;
    
    await storage.createBlobService().startCopyBlob(fileReading.uri + '?sasString', configs.containerName, targetBlob, async (error, result, res) => {
        if (!error) {
            await storage.createBlobService().deleteBlobIfExists(configs.containerName, oriBlob, async (error, result, res) => {
                if (error) {
                    Logs.writeErrorLog(error.stack);
                    return;
                }
            });
        } else {
            Logs.writeErrorLog(error.stack);
            return;
        }
    });
}
