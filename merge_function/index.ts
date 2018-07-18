import * as csv from 'csvtojson';
import * as storage from 'azure-storage';
import * as request from 'request';
import * as moment from 'moment';
import * as configs from '../configs/app.js';

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
module.exports = async (context, myBlob) => {
//export async function run (context, myBlob) {
    context.log('START: ' + moment().format('YYYY-MM-DD HH:mm:ss'));
    try {
        mongoose.connect(process.env.MONGOLAB_URI, configs.mongoose);

        const rows = await readCsv(context.bindingData.uri);
        const entities = await posRepo.getPosSales(rows);
        const reservations = await getCheckins(entities);

        await posRepo.setCheckins(entities, reservations).then(async (docs) => {
            await posRepo.saveToPosSalesTmp(docs, context).then(async () => {
                await moveListFileWorking(context.bindingData);
            });
        });
    } catch (error) {
        context.log(error);
    }
    context.log('END: ' + moment().format('YYYY-MM-DD HH:mm:ss'));
    mongoose.connection.close();
}

/**
 * Get data checkins from mongoose db
 * @param entities [PosSalesEntity, PosSalesEntity, ...]
 */
async function getCheckins (entities) {
    const conds = createConds4Checkins(entities);

    return await mongoose.model('Reservation').find({ $or: conds }, {
        checkins: true, payment_no: true, seat_code: true, performance_day: true
    }).then(docs => { 
        let checkins = {};
        docs.forEach(doc => {
            const prop = doc.payment_no + doc.seat_code + doc.performance_day;
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
function createConds4Checkins(entities: any) {
    return entities.map(entity => {
        return { $and: [
                { payment_no: entity.payment_no },
                { seat_code: entity.seat_code },
                { performance_day: entity.performance_day }]
        };
    });
}

/**
 * Reads all the records in the csv file to create entities stored in the sql server
 * @param filePath string Relative path to csv file
 * @returns Array
 */
async function readCsv (filePath: string) {
    const fileInfo: any = request.get(filePath);
    
    return await csv({noheader: true, output: "csv"}).fromStream(fileInfo).then(docs => {
        if (configs.csv.csv_101.useHeader) docs.shift();
        return docs;
    });
}

/**
 * After saving to the sql server, move the file from the working directory to the complete directory, leaving the file name unchanged
 * @param fileReading object contains the file information you are reading 
 */
async function moveListFileWorking (fileReading) {
    const oriBlob = 'working/' + fileReading.name;
    const targetBlob = 'complete/' + fileReading.name;
    
    await storage.createBlobService().startCopyBlob(fileReading.uri + '?sasString', configs.containerName, targetBlob, async (error, result, res) => {
        await storage.createBlobService().deleteBlobIfExists(configs.containerName, oriBlob, async (error, result, res) => {})
    });
}


