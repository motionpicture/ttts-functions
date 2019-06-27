import * as csv from 'csv';
import * as storage from 'azure-storage';
import * as request from 'request';
import * as moment from 'moment';
import * as configs from '../configs/app.js';
import * as iconv from 'iconv-lite';
import * as fs from 'fs';
import * as https from 'https';
import * as slackFunc from 'request';

const Logs = require("../libs/logHelper");
const posRepo = require("../models/pos_sales");
const mongoose = require("mongoose");
require("../models/reservation.js");

mongoose.Promise = global.Promise;
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
    //this code will be open, if run on local use for development
    /*
    run({
        bindingData: {
            uri: 'https://tttsstorage.blob.core.windows.net/container4aggregate/working/son_test_5.csv',
            name: 'son_test_5.csv',
            properties: {
                length: 330000
            },
            sys: {
                methodName: "merge_function",
                utcNow: moment().toISOString()
            }
        },
        log: (text) => {
            //console.log(text);
        },
        executionContext: {
            invocationId: 686868
        }
    }, null);
    */
}

//if run on local use export async function run (context, myBlob) {
module.exports = async (context, myBlob) => {
//export async function run (context, myBlob) {

    context.funcId = context.executionContext.invocationId;
    context.log(`ProcessId: ${context.funcId}`);

    try {
        mongoose.connect(process.env.MONGOLAB_URI, configs.mongoose);
        const rows: any = await readCsv(context);
        const entities  = await posRepo.getPosSales(rows);

        const errors = await posRepo.validation(entities, context);
        context.log(`${context.bindingData.name}ファイル: Number of lines appears error is ${errors.length}`);

        if (errors.length == 0) {
            const reservations = await getCheckins(entities, context);
            await posRepo.setCheckins(entities, reservations).then(async (docs) => {
                
                await posRepo.saveToPosSales(docs, context).then(async () => {
                    await posRepo.mergeFunc(context);
                });
            });
        } else {
            Logs.writeErrorLog(context, errors.join("\n"));
        }
        mongoose.connection.close();
    } catch (error) {
        context.log(error);
        Logs.writeErrorLog(context, `${context.bindingData.name}ファイル` + "\n" + error.stack);
    }
}

/**
 * Get data checkins from mongoose db
 * @param entities [PosSalesEntity, PosSalesEntity, ...]
 */
async function getCheckins (entities, context) {
    const conds = createConds4Checkins(entities,context);
    context.log(`conditions: ${conds}`);
    return await mongoose.model('Reservation').find({ $or: conds }, {
        checkins: true, payment_no: true, _id: true
    }).then(docs => { 
        let checkins = {};
        docs.forEach(doc => {
            const prop = doc._id;
            checkins[prop] = {entry_flg: 'FALSE', entry_date: null};

            if (doc.checkins.length >= 1)
                checkins[prop] = {entry_flg: 'TRUE', entry_date: doc.checkins[0].when.toISOString()};
        })
        return checkins;
    });
}

/**
 * Converted from the entities found in the csv file into conditions to search in mongoose
 * @param entities [PosSalesEntity, PosSalesEntity, ...]
 */
function createConds4Checkins(entities: any,context) {
    return entities.map(entity => {
        let performance_day = null;
        context.log(`entity: ${entity}`);
        if (entity.performance_day) {
            performance_day = moment(entity.performance_day, "YYYY/MM/DD HH:mm:ss").format("YYYYMMDD");
        }
        let id = 'TT-' + entity.performance_day.substring(2,6) + '-' + entity.payment_no + '-0';
        context.log(`id: ${id}`);

        // return { $and: [
        //         { payment_no: entity.payment_no },
        //         { seat_code: entity.seat_code },
        //         { performance_day: performance_day }]
        // };
        
        return { $and: [
                { _id: id }
            ]
        };
    });
}

/**
 * Reads all the records in the csv file to create entities stored in the sql server
 * @param filePath string Relative path to csv file
 * @returns Array
 */
async function readCsv (context: any) {
    
    const docs = [];
    const localFile = `${require('path').dirname(__dirname)}/${moment().format("YYYYMMDD")}-${context.bindingData.name}`;
    const targetBlob = 'working/' + context.bindingData.name;

    return await new Promise((resolve ,reject) => {
        storage.createBlobService().getBlobToStream(process.env.AZURE_BLOB_STORAGE, targetBlob, fs.createWriteStream(localFile), err => {
            if (err) {
                return reject(err);
            }
            let stream = fs.createWriteStream(localFile, {flags:'a'});
            const readableStream = fs.createReadStream(localFile)
                .pipe(iconv.decodeStream('SJIS'))
                .pipe(iconv.encodeStream('UTF-8'))
                .pipe(csv.parse());
            
            readableStream.on('data', (record) => {
                docs.push(record);
            });

            readableStream.on('end', () => {
                if (configs.csv.csv_101.useHeader) docs.shift();
                fs.unlink(localFile, () => {});
                return resolve(docs);
            });
        });
    });
}


