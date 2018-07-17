import * as csv from 'csvtojson';
import * as storage from 'azure-storage';
import * as request from 'request';
import * as moment from 'moment';

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

export async function run (context, myBlob) {
    context.log(moment().format('YYYY-MM-DD HH:mm:ss'));
    try {
        mongoose.connect(process.env.MONGOLAB_URI, configs.mongoose);

        const rows = await readCsv(context.bindingData.uri);
        const entities = await posRepo.getPosSales(rows);
        const reservations = await getCheckins(entities);
        const posSales = await posRepo.updateCheckins(entities, reservations);
        await posRepo.saveToPosSalesTmp(posSales);
        
    } catch (error) {
        context.log(error);
    }
    context.log('END: ' + moment().format('YYYY-MM-DD HH:mm:ss'));
    mongoose.connection.close();
}

async function getCheckins (entities) {
    const conds = createConds4Checkins(entities);

    return await mongoose.model('Reservation').find({ $or: [conds[0]] }, {
        checkins: true, payment_no: true, seat_code: true, performance_day: true
    }).then(docs => { 
        let checkins = {};
        docs.forEach(doc => {
            const prop = doc.payment_no + doc.seat_code + doc.performance_day;
            checkins[prop] = {entry_flg: 'FALSE', entry_date: ''};

            if (doc.checkins.length >= 1)
                checkins[prop] = {entry_flg: 'TRUE', entry_date: doc.checkins[0].when.toISOString()};
        })
        return checkins;
    });
}

function createConds4Checkins(entities: any) {
    return entities.map(entity => {
        return { $and: [
                { payment_no: entity.payment_no },
                { seat_code: entity.seat_code },
                { performance_day: entity.performance_day }]
        };
    });
}

async function readCsv (filePath: string) {
    const fileInfo: any = request.get(filePath);
    
    return await csv({noheader: true, output: "csv"}).fromStream(fileInfo).then(docs => {
        if (configs.csv.csv_101.useHeader) docs.shift();
        return docs;
    });
}


