import * as request from 'request';
import * as moment from 'moment';
import * as configs from '../configs/app.js';

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
    //this code will be open, if run on local use for development
    /*
    run({
        log: (text: string) => {
            console.log(text);
        },
        done: (text: string) => {
            return true;   
        }
    }, {
        originalUrl: 'https://ttts-functions-develop.azurewebsites.net/api/update_function',
        query: {
            to: '2018-03-01',
            from: '2018-03-03'
        }
    });
    */
}

//if run on local use export async function run (context, req) {
module.exports = async (context, req) => {
//export async function run (context, req) {
    context.log('START: ' + moment().format('YYYY-MM-DD HH:mm:ss'));
    
    try {
        let conditions: IConditions = {
            from: null, to: null
        };

        if (req.query.from === undefined && req.query.to === undefined) {
            conditions.from = moment().subtract(7, 'days').format('YYYY-MM-DD');
            conditions.to = moment().format('YYYY-MM-DD');
        } 
        if (req.query.from !== undefined) conditions.from = req.query.from;
        if (req.query.to !== undefined) conditions.to = req.query.to;
        
        //check link's is valid
        const errorMessage = await validate(conditions);
        if (errorMessage.length > 0) {
            context.log(errorMessage);
            context.res = {status: 404, body: errorMessage.join("\n")};
        } else {
            //connect into SQL server to get datas had performance_day in period supplied on link
            await posRepo.searchPosSales(conditions, context).then( async conds => {
                if (conds.length > 0) {
                    //connect into mongoose to get checkins datas got it from previous step
                    let entities = await getCheckins(conds, context);
                    if (entities.length > 0) {
                        await posRepo.reUpdateCheckins(entities, context);
                    }
                }
            });
            context.res = {status: 200, body: "更新しました!"};
        }
        
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

/**
 * Check the data transmitted to the server from the client
 * @param req 
 */
const CSV_LINE_ENDING: string = '\r\n';
async function validate(conditions: IConditions): Promise<any> {

    const errors: any = [];
    if (conditions.from !== null && isValidDate(conditions.from) == false) {
        errors.push('時間From値が正しくないです');
    }
    
    if (conditions.to !== null && isValidDate(conditions.to) == false) {
        errors.push('時間To値が正しくないです');
    }

    if (conditions.to !== null && conditions.from !== null && errors.length == 0 && moment(conditions.to) < moment(conditions.from)) {
        errors.push('時間が正しくないです');
    }
    
    return errors;
}

/**
 * Check valid date YYYY-MM-DD
 * @param s 
 */
function isValidDate(s: string) {
    const dateFormat = /^\d{1,4}[-]\d{1,2}[-]\d{1,2}$/;

    if (dateFormat.test(s)) {
        s = s.replace(/0*(\d*)/gi,"$1");
        let dateArray: any[] = s.split(/[\.|\/|-]/);
      
        dateArray[1] = dateArray[1]-1;
        if (dateArray[0].length < 4) {
            dateArray[0] = (parseInt(dateArray[0]) < 50) ? 2000 + parseInt(dateArray[0]) : 1900 + parseInt(dateArray[0]);
        }
        
        const testDate = new Date(dateArray[0], dateArray[1], dateArray[2]);
        if (testDate.getDate() != dateArray[2] || testDate.getMonth() != dateArray[1] || testDate.getFullYear() != dateArray[0]) {
            return false;
        }
        return true;
    }
    return false;
}
