import * as request from 'request';
import * as moment from 'moment';
import * as configs from '../configs/app.js';

const posRepo = require("../models/pos_sales");
const mongoose = require("mongoose");
require("../models/reservation.js");
mongoose.Promise = global.Promise;

//開発環境で使うだけ、本番でこれを使わない
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
    //this code will be open, if run on local use for development
    /*
    run({
        log: (text: string) => {
            console.log(text);
        }
    }, {
        originalUrl: 'https://ttts-functions-develop.azurewebsites.net/api/update_function',
        query: {
            from: '2018-03-01',
            to: '2018-03-02'
        }
    });
    */
}

//if run on local use export async function run (context, req) {
module.exports = async (context, req) => {
//export async function run (context, req) {
    context.log('START: ' + moment().format('YYYY-MM-DD HH:mm:ss'));
    
    try {
        const conditions = {
            from: req.query.from === undefined ? moment().subtract(7, 'days').format('YYYY-MM-DD') : req.query.from,
            to: req.query.to === undefined ? moment().format('YYYY-MM-DD') : req.query.to
        };

        //check link's is valid
        if (isNaN(Date.parse(conditions.from)) || isNaN(Date.parse(conditions.to))) {
            context.log('update_functionの時間が正しくない。');
        } else {
            conditions.to = conditions.to.replace(/[-]/g, '');
            conditions.from = conditions.from.replace(/[-]/g, '');

            //connect into SQL server to get datas had performance_day in period supplied on link
            await posRepo.searchPosSales(conditions, context).then( async conds => {
                if (conds.length > 0) {
                
                    //connect into mongoose to get checkins datas got it from previous step
                    let entities = await getCheckins(conds, context);
                    await posRepo.reUpdateCheckins(entities, context);
                }
            });
        }

        context.res = {status: 200, body: "更新しました!"};
        context.done();
    } catch (error) {
        context.log(error);
    }
    context.log('END: ' + moment().format('YYYY-MM-DD HH:mm:ss'));
}

/**
 * //connect into mongoose to get checkins datas got it from previous step
 * @param conds Array
 * @param context Azure function of variable
 */
async function getCheckins (conds, context) {
    mongoose.connect(process.env.MONGOLAB_URI, configs.mongoose);
    const entities = await mongoose.model('Reservation')
        .find({ $or: conds },{checkins: true, payment_no: true, seat_code: true, performance_day: true}).exec()
        .then(docs => docs.map( doc => {
            
            doc.entry_flg = 'FALSE';
            doc.entry_date = null;

            if (doc.checkins.length >= 1) {
                doc.entry_flg = 'TRUE';
                doc.entry_date = doc.checkins[0].when.toISOString();
            }

            return '(' + [
                `'${doc.payment_no}'`
                , `'${doc.seat_code}'`
                , `'${doc.performance_day}'`
                , `'${doc.entry_flg}'`
                , doc.entry_date !== null ? `'${doc.entry_date}'` : `NULL`].join(',') + ')';
        }));

    mongoose.connection.close();
    return entities;
}