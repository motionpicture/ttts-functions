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
const moment = require("moment");
const configs = require("../configs/app.js");
const ttts = require("@motionpicture/ttts-domain");
const mongooseConnectionOptions_1 = require("../configs/mongooseConnectionOptions");
const posRepo = require("../models/posRepo.js");
const posEntity = require("../models/posEntity.js");
const Logs = require("../libs/logHelper");
//開発環境で使うだけ、本番でこれを使わない
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
    /*
    run({
        log: (text: string) => {
            console.log(text);
        },
        done: () => {}
    }, {
        originalUrl: 'https://ttts-functions-develop.azurewebsites.net/api/update_function',
        query: {
            from: '2018-01-01 00:00:00',
            to: '2018-09-05 23:59:59'
        }
    });
    */
}
const start = new Date();
//大切な機能
function run(context, req) {
    return __awaiter(this, void 0, void 0, function* () {
        Logs.writeInfoLog(`Node.js HTTP trigger function processed a request. RequestUri=%s` + req.originalUrl);
        const conditions = {
            from: req.query.from === undefined ? moment().subtract(7, 'days').format('YYYY-MM-DD') : req.query.from,
            to: req.query.to === undefined ? moment().format('YYYY-MM-DD') : req.query.to
        };
        if (isNaN(Date.parse(conditions.from)) || isNaN(Date.parse(conditions.to))) {
            Logs.writeErrorLog('update_functionの時間が正しくない。');
            return;
        }
        else {
            conditions.from = conditions.from + ' 00:00:00';
            conditions.to = conditions.to + ' 23:59:59';
        }
        const multithreading = [];
        yield Promise.all(yield searchPosSales(conditions)).then(result => {
            result.forEach((r) => {
                multithreading.push(r);
            });
        });
        context.res = {
            status: 200,
            body: "Success!"
        };
        Logs.writeInfoLog(JSON.stringify(context.res));
        context.done();
    });
}
exports.run = run;
const searchPosSales = (conditions) => __awaiter(this, void 0, void 0, function* () {
    const promises = [];
    try {
        const count = yield posRepo.countListPosSales(conditions);
        if (count > 0) {
            let offset = null;
            for (let i = 0; i < Math.ceil(count / configs.maxRecordExec); i++) {
                offset = offset === null ? 0 : offset + configs.maxRecordExec;
                promises.push(yield threading(conditions, offset));
            }
        }
    }
    catch (error) {
        Logs.writeErrorLog(error);
    }
    return promises;
});
const threading = (conditions, offset) => __awaiter(this, void 0, void 0, function* () {
    const threading = yield posRepo.getListPosSales(conditions, { offset: offset, limit: configs.maxRecordExec });
    if (threading.length == 0)
        return;
    const conds = [];
    threading.map(d => {
        conds.push({
            $and: [
                { payment_no: d.payment_no },
                { seat_code: d.seat_code },
                { performance_day: d.performance_day }
            ]
        });
    });
    ttts.mongoose.connect(process.env.MONGOLAB_URI, mongooseConnectionOptions_1.default);
    const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
    const reservations = yield reservationRepo.reservationModel
        .find({ $or: conds }, { checkins: true, payment_no: true, seat_code: true, performance_day: true })
        .exec()
        .then(docs => docs.map(doc => {
        const tmp = doc.toObject();
        let entity = {
            performance_day: tmp.performance_day,
            payment_no: tmp.payment_no,
            seat_code: tmp.seat_code
        };
        if (tmp.checkins.length >= 1) {
            entity.entry_flg = 'TRUE';
            entity.entry_date = tmp.checkins[0].when.toISOString();
        }
        else {
            entity.entry_flg = 'FALSE';
        }
        return entity;
    }));
    ttts.mongoose.disconnect();
    if (reservations.length > 0) {
        yield posRepo.updateListPosSales(reservations);
    }
    return threading;
});
