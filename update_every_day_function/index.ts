import * as request from 'request';
import * as moment from 'moment';
import * as configs from '../configs/app.js';

const Logs = require("../libs/logHelper");
const posRepo = require("../models/pos_sales");
const mongoose = require("mongoose");
require("../models/reservation.js");
mongoose.Promise = global.Promise;

export interface IConditions {
    from: string | null,
    to: string | null
}

//開発環境で使うだけ、本番でこれを使わない
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}

module.exports = async (context, myTimer) => {
    context.log('START: ' + moment().format('YYYY-MM-DD HH:mm:ss'));

    try {
        let conditions: IConditions = {
            from: moment().subtract(1, 'days').format('YYYY-MM-DD'), 
            to: moment().subtract(1, 'days').format('YYYY-MM-DD')
        };
        context.log('conditions is: ' + JSON.stringify(conditions));

        //connect into SQL server to get datas had performance_day in period supplied on link
        await posRepo.searchPosSales(conditions, context).then( async records => {
            context.log('pos_sales have been found: ' + JSON.stringify(records));
            if (records.length > 0) {
                
                //connect into mongoose to get checkins datas got it from previous step
                let entities = await getCheckins(records, context);
                context.log('information in mongoose: ' + JSON.stringify(entities));
                if (entities.length > 0) {
                    await posRepo.reUpdateCheckins(entities, context);
                }
            }
        });
    } catch (error) {
        Logs.writeErrorLog(error.stack);
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