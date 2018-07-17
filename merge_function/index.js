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
const request = require("request");
const moment = require("moment");
const Logs = require("../libs/logHelper");
const posRepo = require("../models/pos_sales");
const configs = require("../configs/app.js");
const mongoose = require("mongoose");
require("../models/reservation.js");
mongoose.Promise = global.Promise;
//開発環境で使うだけ、本番でこれを使わない
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
    run({
        bindingData: {
            uri: 'https://tttsstorage.blob.core.windows.net/container4bi/son/csv_20180717144124.csv',
            //uri: 'https://tttsstorage.blob.core.windows.net/container4bi/son/csv_20180715165413.csv',
            name: 'csv_20180717144124.csv'
            //name: 'csv_20180715165413.csv'
        },
        log: (text) => {
            console.log(text);
        }
    }, null);
}
function run(context, myBlob) {
    return __awaiter(this, void 0, void 0, function* () {
        context.log(moment().format('YYYY-MM-DD HH:mm:ss'));
        try {
            mongoose.connect(process.env.MONGOLAB_URI, configs.mongoose);
            const rows = yield readCsv(context.bindingData.uri);
            const entities = yield posRepo.getPosSales(rows);
            const reservations = yield getCheckins(entities);
            const posSales = yield posRepo.updateCheckins(entities, reservations);
            yield posRepo.saveToPosSalesTmp(posSales);
        }
        catch (error) {
            context.log(error);
        }
        context.log('END: ' + moment().format('YYYY-MM-DD HH:mm:ss'));
        mongoose.connection.close();
    });
}
exports.run = run;
function getCheckins(entities) {
    return __awaiter(this, void 0, void 0, function* () {
        const conds = createConds4Checkins(entities);
        return yield mongoose.model('Reservation').find({ $or: [conds[0]] }, {
            checkins: true, payment_no: true, seat_code: true, performance_day: true
        }).then(docs => {
            let checkins = {};
            docs.forEach(doc => {
                const prop = doc.payment_no + doc.seat_code + doc.performance_day;
                checkins[prop] = { entry_flg: 'FALSE', entry_date: '' };
                if (doc.checkins.length >= 1)
                    checkins[prop] = { entry_flg: 'TRUE', entry_date: doc.checkins[0].when.toISOString() };
            });
            return checkins;
        });
    });
}
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
