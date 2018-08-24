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
const request = require("request");
const configs = require("../configs/app.js");
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
            uri: 'https://tttsstorage.blob.core.windows.net/container4bi/tmp/son',
            name: 'son'
        },
        log: (text) => {
            console.log(text);
        }
    }, null);
    */
}
//if run on local use export async function run (context, myBlob) {
module.exports = (context, myBlob) => __awaiter(this, void 0, void 0, function* () {
    //export async function run (context, myBlob) {
    context.funcId = context.executionContext.invocationId;
    context.log(`${context.funcId}ファイル: ${context.bindingData.name}`);
    try {
        mongoose.connect(process.env.MONGOLAB_URI, configs.mongoose);
        const rows = yield readCsv(context.bindingData.uri);
        const entities = yield posRepo.getPosSales(rows);
        const errors = yield posRepo.validation(entities, context);
        context.log(`${context.bindingData.name}ファイル: Number of lines appears error is ${errors.length}`);
        if (errors.length == 0) {
            const reservations = yield getCheckins(entities);
            yield posRepo.setCheckins(entities, reservations).then((docs) => __awaiter(this, void 0, void 0, function* () {
                yield posRepo.saveToPosSales(docs, context).then(() => __awaiter(this, void 0, void 0, function* () {
                    if (yield posRepo.mergeFunc(context)) {
                        yield moveListFileWorking(context.bindingData);
                    }
                    ;
                }));
            }));
        }
        else {
            Logs.writeErrorLog(errors.join("\n"));
        }
    }
    catch (error) {
        Logs.writeErrorLog(`${context.bindingData.name}ファイル` + "\n" + error.stack);
    }
});
/**
 * Get data checkins from mongoose db
 * @param entities [PosSalesEntity, PosSalesEntity, ...]
 */
function getCheckins(entities) {
    return __awaiter(this, void 0, void 0, function* () {
        const conds = createConds4Checkins(entities);
        return yield mongoose.model('Reservation').find({ $or: conds }, {
            checkins: true, payment_no: true, seat_code: true, performance_day: true
        }).then(docs => {
            let checkins = {};
            docs.forEach(doc => {
                const prop = doc.payment_no + doc.seat_code + doc.performance_day;
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
function createConds4Checkins(entities) {
    return entities.map(entity => {
        return { $and: [
                { payment_no: entity.payment_no },
                { seat_code: entity.seat_code },
                { performance_day: entity.performance_day }
            ]
        };
    });
}
/**
 * Reads all the records in the csv file to create entities stored in the sql server
 * @param filePath string Relative path to csv file
 * @returns Array
 */
function readCsv(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileInfo = request.get(filePath);
        return yield csv({ noheader: true, output: "csv" }).fromStream(fileInfo).then(docs => {
            if (configs.csv.csv_101.useHeader)
                docs.shift();
            return docs;
        });
    });
}
/**
 * After saving to the sql server, move the file from the working directory to the complete directory, leaving the file name unchanged
 * @param fileReading object contains the file information you are reading
 */
function moveListFileWorking(fileReading) {
    return __awaiter(this, void 0, void 0, function* () {
        const oriBlob = 'working/' + fileReading.name;
        const targetBlob = 'complete/' + fileReading.name;
        yield storage.createBlobService().startCopyBlob(fileReading.uri + '?sasString', configs.containerName, targetBlob, (error, result, res) => __awaiter(this, void 0, void 0, function* () {
            yield storage.createBlobService().deleteBlobIfExists(configs.containerName, oriBlob, (error, result, res) => __awaiter(this, void 0, void 0, function* () { }));
        }));
    });
}
