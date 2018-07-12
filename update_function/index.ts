import * as moment from 'moment';
import * as configs from '../configs/app.js';
import * as ttts from '@motionpicture/ttts-domain';
import * as mongooseConnectionOptions_1 from '../configs/mongooseConnectionOptions';

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
const start: any = new Date();

//大切な機能
export async function run (context, req) {
    Logs.writeInfoLog(`Node.js HTTP trigger function processed a request. RequestUri=%s`+ req.originalUrl);
    const conditions = {
        from: req.query.from === undefined ? moment().subtract(7, 'days').format('YYYY-MM-DD') : req.query.from,
        to: req.query.to === undefined ? moment().format('YYYY-MM-DD') : req.query.to
    };

    if (isNaN(Date.parse(conditions.from)) || isNaN(Date.parse(conditions.to))) {
        Logs.writeErrorLog('update_functionの時間が正しくない。');
        return;
    } else {
        conditions.from = conditions.from + ' 00:00:00';
        conditions.to = conditions.to + ' 23:59:59';
    }

    const multithreading = [];
    await Promise.all(await searchPosSales(conditions)).then( result => {
        result.forEach((r: any) => {
            multithreading.push(r);
        });
    });

    context.res = {
        status: 200,
        body: "Success!"
    };

    Logs.writeInfoLog(JSON.stringify(context.res));
    context.done();
}


const searchPosSales = async (conditions: any): Promise<Object[]> => {
    const promises: any[] = [];

    try {
        const count = await posRepo.countListPosSales(conditions);
        if (count > 0) {
            let offset: number = null;
            for (let i = 0; i < Math.ceil(count / configs.maxRecordExec); i++) {
                offset = offset === null ? 0 : offset + configs.maxRecordExec;
                promises.push(await threading(conditions, offset));
            }
        }
    } catch (error) {
        Logs.writeErrorLog(error);
    }
    
    return promises;
}

const threading = async (conditions, offset) => {
    const threading = await posRepo.getListPosSales(conditions, {offset: offset, limit: configs.maxRecordExec});
    if (threading.length == 0) return;
    
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
    const reservations = await reservationRepo.reservationModel
        .find({ $or: conds },{checkins: true, payment_no: true, seat_code: true, performance_day: true})
        .exec()
        .then(docs => docs.map( doc => {
            const tmp = doc.toObject();
            let entity: any = {
                performance_day: tmp.performance_day,
                payment_no: tmp.payment_no,
                seat_code: tmp.seat_code
            };

            if (tmp.checkins.length >= 1) {
                entity.entry_flg = 'TRUE';
                entity.entry_date = tmp.checkins[0].when.toISOString();
            } else {
                entity.entry_flg = 'FALSE';
            }

            return entity;
        }));
    
    ttts.mongoose.disconnect();
    if (reservations.length > 0) {
        await posRepo.updateListPosSales(reservations);
    }

    return threading;
};