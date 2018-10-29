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
const client2Slack = require("request");
const moment = require("moment");
const storage = require("azure-storage");
const configs = require("../configs/app.js");
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}
function sendMessage(message) {
    return __awaiter(this, void 0, void 0, function* () {
        let options = {
            uri: process.env.SLACK_WEBHOOK_URI,
            headers: { "Content-type": "application/json" },
            json: {
                //https://api.slack.com/docs/message-attachmentsを参照
                attachments: [
                    { text: message, color: 'danger' }
                ]
            }
        };
        yield client2Slack.post(options, (error, response, body) => __awaiter(this, void 0, void 0, function* () { }));
    });
}
module.exports = (context, req) => __awaiter(this, void 0, void 0, function* () {
    const tableService = storage.createTableService();
    const entGen = storage.TableUtilities.entityGenerator;
    const query = new storage.TableQuery()
        .where('ErrorDetails != ?', '')
        .and('EndTime >= ?', new Date(moment(moment().subtract(1, 'days')).toISOString()));
    const tableName = `AzureWebJobsHostLogs${moment(moment().toISOString()).format('YYYYMM')}`;
    //bolbにテーブルログの情報を取得
    const getErrors = () => __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            tableService.queryEntities(tableName, query, null, (err, data) => {
                if (err)
                    reject(err);
                else
                    resolve(data.entries.length > 0 ? data.entries : undefined);
            });
        });
    });
    //エラーメッセージを送信したらエラーのexportDateを更新
    const setExportDate = (entity) => __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            tableService.insertOrReplaceEntity(tableName, entity, function (error) {
                if (error)
                    reject(error);
                else
                    resolve(true);
            });
        });
    });
    const events = yield getErrors();
    if (events !== undefined) {
        for (let x in events) {
            let event = events[x];
            if (event.exportDate !== undefined)
                continue;
            //エラー内容を取得
            let errorMessage = '';
            if (event.ArgumentsJson !== undefined) {
                let container = JSON.parse(event.ArgumentsJson._)[configs.containerName];
                errorMessage = container !== undefined ? container + ': ' : '';
            }
            if (event.ErrorDetails !== undefined) {
                errorMessage += event.ErrorDetails._;
            }
            //エラーメッセージを送信
            if (errorMessage !== undefined)
                yield sendMessage(errorMessage);
            event.exportDate = entGen.DateTime(new Date(moment().toISOString()));
            yield setExportDate(event);
        }
    }
});
