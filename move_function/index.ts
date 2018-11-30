import * as client2Slack from 'request';
import * as moment from 'moment';
import * as storage from 'azure-storage';
import * as configs from '../configs/app.js';
import { resolve } from 'dns';
import { rejects } from 'assert';

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}

module.exports = async (context, req) => {

    const tableService = storage.createTableService();
    const entGen = storage.TableUtilities.entityGenerator;
    const tableName = `AzureWebJobsHostLogs${moment(moment().toISOString()).format('YYYYMM')}`;
    
    const checkTableExists: any = async () => {
        return new Promise((resolve, rejects) => {
            tableService.createTableIfNotExists(tableName, function(error, result, response) {
                resolve(result);
            });
        });
    }

    const checkTbl = await checkTableExists();
    if (checkTbl.isSuccessful === false) return false;

    //bolbにテーブルログの情報を取得
    const getFileSuccess: any = async (query) => {
        return new Promise((resolve, reject) => {
            tableService.queryEntities(tableName, query, null, (err, data) => {
                if (err) reject(undefined);
                else resolve(data.entries.length > 0 ? data.entries : undefined);    
            });
        });
    };

    const query = new storage.TableQuery()
        .where('fileHandleComplete != ?', '')
        .and('EndTime >= ?', new Date(moment(moment().subtract(1, 'days')).toISOString()));

    const events = await getFileSuccess(query);
    if (events === undefined) return false;

    if (events !== undefined) {
        for(let x in events) {
            let event = events[x];
            if (event.moveDate !== undefined) continue;

            const oriBlob    = 'working/' + event.fileHandleComplete._;
            const targetBlob = 'complete/' + event.fileHandleComplete._;
            const oriUrl     = event.fileHandleUrl._;

            let copyHandle = await new Promise((resolve ,reject) => {
                storage.createBlobService().startCopyBlob(oriUrl, process.env.AZURE_BLOB_STORAGE, targetBlob, async (err, result, res) => {
                    if (err) return reject(false);
                    return resolve(true);
                });
            });

            if (copyHandle === false) continue;
            let deleteHandle = await new Promise((resolve ,reject) => {
                storage.createBlobService().deleteBlobIfExists(process.env.AZURE_BLOB_STORAGE, oriBlob, async (err, result, res) => {
                    if (err) return reject(false);
                    return resolve(true);
                })
            });
        }
    }
}