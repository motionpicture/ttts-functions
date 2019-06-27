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
const csv = require("csv");
const storage = require("azure-storage");
const moment = require("moment");
const configs = require("../configs/app.js");
const iconv = require("iconv-lite");
const fs = require("fs");
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
module.exports = (context, myBlob) => __awaiter(this, void 0, void 0, function* () {
    //export async function run (context, myBlob) {
    context.funcId = context.executionContext.invocationId;
    context.log(`ProcessId: ${context.funcId}`);
    try {
        mongoose.connect(process.env.MONGOLAB_URI, configs.mongoose);
        const rows = yield readCsv(context);
        const entities = yield posRepo.getPosSales(rows);
        const errors = yield posRepo.validation(entities, context);
        context.log(`${context.bindingData.name}ファイル: Number of lines appears error is ${errors.length}`);
        if (errors.length == 0) {
            const reservations = yield getCheckins(entities, context);
            yield posRepo.setCheckins(entities, reservations).then((docs) => __awaiter(this, void 0, void 0, function* () {
                yield posRepo.saveToPosSales(docs, context).then(() => __awaiter(this, void 0, void 0, function* () {
                    yield posRepo.mergeFunc(context);
                }));
            }));
        }
        else {
            Logs.writeErrorLog(context, errors.join("\n"));
        }
        mongoose.connection.close();
    }
    catch (error) {
        context.log(error);
        Logs.writeErrorLog(context, `${context.bindingData.name}ファイル` + "\n" + error.stack);
    }
});
/**
 * Get data checkins from mongoose db
 * @param entities [PosSalesEntity, PosSalesEntity, ...]
 */
function getCheckins(entities, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const conds = createConds4Checkins(entities, context);
        context.log(`conditions: ${conds}`);

        return yield mongoose.model('Reservation').find({ $or: conds }, {
            checkins: true, payment_no: true, _id: true
        }).then(docs => {
            let checkins = {};
            docs.forEach(doc => {
                const prop = doc._id;
                checkins[prop] = { entry_flg: 'FALSE', entry_date: null };
                if (doc.checkins.length >= 1)
                    checkins[prop] = { entry_flg: 'TRUE', entry_date: doc.checkins[0].when.toISOString() };
            });
            return checkins;
        });
    });
}
/**
 * Converted from the entities found in the csv file into conditions to search in mongoose
 * @param entities [PosSalesEntity, PosSalesEntity, ...]
 */
function createConds4Checkins(entities, context) {
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
        //         { performance_day: performance_day }
        //     ]
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
function readCsv(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const docs = [];
        const localFile = `${require('path').dirname(__dirname)}/${moment().format("YYYYMMDD")}-${context.bindingData.name}`;
        const targetBlob = 'working/' + context.bindingData.name;
        return yield new Promise((resolve, reject) => {
            storage.createBlobService().getBlobToStream(process.env.AZURE_BLOB_STORAGE, targetBlob, fs.createWriteStream(localFile), err => {
                if (err) {
                    return reject(err);
                }
                let stream = fs.createWriteStream(localFile, { flags: 'a' });
                const readableStream = fs.createReadStream(localFile)
                    .pipe(iconv.decodeStream('SJIS'))
                    .pipe(iconv.encodeStream('UTF-8'))
                    .pipe(csv.parse());
                readableStream.on('data', (record) => {
                    docs.push(record);
                });
                readableStream.on('end', () => {
                    if (configs.csv.csv_101.useHeader)
                        docs.shift();
                    fs.unlink(localFile, () => { });
                    return resolve(docs);
                });
            });
        });
    });
}
