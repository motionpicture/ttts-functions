import * as client2Slack from 'request';
import * as moment from 'moment';
import * as storage from 'azure-storage';
import * as configs from '../configs/app.js';
import { resolve } from 'dns';
import { rejects } from 'assert';

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}

async function sendMessage (message) {

    let options = {
        uri: process.env.SLACK_WEBHOOK_URI,
        headers: { "Content-type": "application/json" },
        json: {
            //https://api.slack.com/docs/message-attachmentsを参照
            attachments: [
                {text: message, color: 'danger'}
            ]
        }
    };

    await client2Slack.post(options, async (error, response, body) => {});
}

module.exports = async (context, req) => {
    
    const tableService = storage.createTableService();
    const entGen = storage.TableUtilities.entityGenerator;
    const query = new storage.TableQuery()
        .where('ErrorDetails != ?', '')
        .and('EndTime >= ?', new Date(moment(moment().subtract(1, 'days')).toISOString()));
    const tableName = `AzureWebJobsHostLogs${moment(moment().toISOString()).format('YYYYMM')}`;

    //bolbにテーブルログの情報を取得
    const getErrors: any = async () => {
        return new Promise((resolve, reject) => {
            tableService.queryEntities(tableName, query, null, (err, data) => {
                if (err) reject(err);
                else resolve(data.entries.length > 0 ? data.entries : undefined);    
            });
        });
    };

    //エラーメッセージを送信したらエラーのexportDateを更新
    const setExportDate: any = async (entity: any) => {
        return new Promise((resolve, reject) => {
            tableService.insertOrReplaceEntity(tableName, entity, function(error) {
                if (error) reject(error);
                else resolve(true);
            });
        });
    }

    const events = await getErrors();
    if (events !== undefined) {
        for(let x in events) {
            let event = events[x];
            if (event.exportDate !== undefined) continue;

            //エラー内容を取得
            let errorMessage = '';
            if (event.ArgumentsJson !== undefined) {
                let container = JSON.parse(event.ArgumentsJson._)[configs.containerName];
                errorMessage = container !== undefined ? container + ': ': '';
            }

            if (event.ErrorDetails !== undefined) {
                errorMessage += event.ErrorDetails._;
            }
            
            //エラーメッセージを送信
            if (errorMessage !== undefined) await sendMessage(errorMessage);
            event.exportDate = entGen.DateTime(new Date(moment().toISOString()));
            await setExportDate(event);
        }
    }
}