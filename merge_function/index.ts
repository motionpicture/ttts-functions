import * as csv from 'csv';
import * as storage from 'azure-storage';
import * as request from 'request';
import * as moment from 'moment';
import * as configs from '../configs/app.js';
import * as iconv from 'iconv-lite';
import * as fs from 'fs';
import * as https from 'https';
import * as slackFunc from 'request';

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
module.exports = async (context, myBlob) => {
//export async function run (context, myBlob) {

    context.funcId = context.executionContext.invocationId;
    context.log(`ProcessId: ${context.funcId}`);

    try {
        mongoose.connect(process.env.MONGOLAB_URI, configs.mongoose);
        const rows: any = await readCsv(context);
        const entities  = await posRepo.getPosSales(rows);

        const errors = await posRepo.validation(entities, context);
        context.log(`${context.bindingData.name}ファイル: Number of lines appears error is ${errors.length}`);

        if (errors.length == 0) {
            await posRepo.setCheckins(entities).then(async (docs) => {
                
                await posRepo.saveToPosSales(docs, context).then(async () => {
                    await posRepo.mergeFunc(context);
                });
            });
        } else {
            Logs.writeErrorLog(context, errors.join("\n"));
        }
        mongoose.connection.close();
    } catch (error) {
        context.log(error);
        Logs.writeErrorLog(context, `${context.bindingData.name}ファイル` + "\n" + error.stack);
    }
}

/**
 * Reads all the records in the csv file to create entities stored in the sql server
 * @param filePath string Relative path to csv file
 * @returns Array
 */
async function readCsv (context: any) {
    
    const docs = [];
    const localFile = `${require('path').dirname(__dirname)}/${moment().format("YYYYMMDD")}-${context.bindingData.name}`;
    const targetBlob = 'working/' + context.bindingData.name;

    return await new Promise((resolve ,reject) => {
        storage.createBlobService().getBlobToStream(process.env.AZURE_BLOB_STORAGE, targetBlob, fs.createWriteStream(localFile), err => {
            if (err) {
                return reject(err);
            }
            let stream = fs.createWriteStream(localFile, {flags:'a'});
            const readableStream = fs.createReadStream(localFile)
                .pipe(iconv.decodeStream('SJIS'))
                .pipe(iconv.encodeStream('UTF-8'))
                .pipe(csv.parse());
            
            readableStream.on('data', (record) => {
                docs.push(record);
            });

            readableStream.on('end', () => {
                if (configs.csv.csv_101.useHeader) docs.shift();
                fs.unlink(localFile, () => {});
                return resolve(docs);
            });
        });
    });
}


