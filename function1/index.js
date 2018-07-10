"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const csv = require("csvtojson");
const storage = require("azure-storage");
const yaml = require("js-yaml");
const fs = require("fs");
const request = require("request");
const ttts = require("@motionpicture/ttts-domain");
const mongooseConnectionOptions_1 = require("../configs/mongooseConnectionOptions");
const configs = require("../configs/app.js");
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
        log: (text) => {
            console.log(text);
        }
    }, null);
}
//大切な機能
function run(context, myBlob) {
    return __awaiter(this, void 0, void 0, function* () {
        context.log('---START---');
        const rows = [];
        try {
            //CSVの項目を読む
            const csvPath = `${__dirname}/../configs/CSV/101.csv.yml`;
            const header = Object.getOwnPropertyNames(yaml.safeLoad(fs.readFileSync(csvPath, 'utf8')));
            const fileInfo = request.get(context.bindingData.uri);
            //CSVのデータをStorageで読む
            yield csv({ noheader: true, output: "csv" })
                .fromStream(fileInfo)
                .then(docs => {
                if (configs.csv.csv_101.useHeader) {
                    docs.shift();
                }
                docs.forEach(doc => {
                    rows.push(doc);
                });
            });
            //PosSalesエンティティを作成
            const entities = yield posRepo.getPosSales(header, rows);
            ttts.mongoose.connect(process.env.MONGOLAB_URI, mongooseConnectionOptions_1.default);
            for (var x in entities) {
                try {
                    const conditions = [
                        { payment_no: entities[x].payment_no },
                        { seat_code: entities[x].seat_code },
                        { performance_day: entities[x].performance_day }
                    ];
                    const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
                    const reservations = yield reservationRepo.reservationModel.find({ $and: conditions })
                        .exec()
                        .then(docs => docs.map(doc => doc.toObject()));
                    if (reservations.length != 1)
                        continue;
                    if (reservations[0].checkins.length >= 1) {
                        entities[x].entry_flg = 'TRUE';
                        entities[x].entry_date = reservations[0].checkins[0].when.toISOString();
                    }
                    else {
                        entities[x].entry_flg = 'FALSE';
                    }
                }
                catch (error) {
                    //Logファイルにバグを書く
                    Logs.writeErrorLog(error);
                    return;
                }
            }
            ttts.mongoose.disconnect();
            yield posRepo.insertPosSales(entities);
            yield moveListFileWorking(context.bindingData);
        }
        catch (error) {
            Logs.writeErrorLog(error);
            return;
        }
        context.log('---END---');
    });
}
exports.run = run;
//全部ファイルを遷移
function moveListFileWorking(fileReading) {
    return __awaiter(this, void 0, void 0, function* () {
        const oriBlob = 'working/' + fileReading.name;
        const targetBlob = 'complete/' + fileReading.name;
        yield storage.createBlobService().startCopyBlob(fileReading.uri + '?sasString', configs.containerName, targetBlob, (error, result, res) => __awaiter(this, void 0, void 0, function* () {
            if (!error) {
                yield storage.createBlobService().deleteBlobIfExists(configs.containerName, oriBlob, (error, result, res) => __awaiter(this, void 0, void 0, function* () {
                    if (error) {
                        Logs.writeErrorLog(error);
                        return;
                    }
                }));
            }
            else {
                Logs.writeErrorLog(error);
                return;
            }
        }));
    });
}
