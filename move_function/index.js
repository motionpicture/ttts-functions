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
const moment = require("moment");
const storage = require("azure-storage");
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}
module.exports = (context, req) => __awaiter(this, void 0, void 0, function* () {
    const tableService = storage.createTableService();
    const entGen = storage.TableUtilities.entityGenerator;
    const tableName = `AzureWebJobsHostLogs${moment(moment().toISOString()).format('YYYYMM')}`;
    const checkTableExists = () => __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, rejects) => {
            tableService.createTableIfNotExists(tableName, function (error, result, response) {
                resolve(result);
            });
        });
    });
    const checkTbl = yield checkTableExists();
    if (checkTbl.isSuccessful === false)
        return false;
    //bolbにテーブルログの情報を取得
    const getFileSuccess = (query) => __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            tableService.queryEntities(tableName, query, null, (err, data) => {
                if (err)
                    reject(undefined);
                else
                    resolve(data.entries.length > 0 ? data.entries : undefined);
            });
        });
    });
    const query = new storage.TableQuery()
        .where('fileHandleComplete != ?', '')
        .and('EndTime >= ?', new Date(moment(moment().subtract(1, 'days')).toISOString()));
    const events = yield getFileSuccess(query);
    if (events === undefined)
        return false;
    if (events !== undefined) {
        for (let x in events) {
            let event = events[x];
            if (event.moveDate !== undefined)
                continue;
            const oriBlob = 'working/' + event.fileHandleComplete._;
            const targetBlob = 'complete/' + event.fileHandleComplete._;
            const oriUrl = event.fileHandleUrl._;
            let copyHandle = yield new Promise((resolve, reject) => {
                storage.createBlobService().startCopyBlob(oriUrl, process.env.AZURE_BLOB_STORAGE, targetBlob, (err, result, res) => __awaiter(this, void 0, void 0, function* () {
                    if (err)
                        return reject(false);
                    return resolve(true);
                }));
            });
            if (copyHandle === false)
                continue;
            let deleteHandle = yield new Promise((resolve, reject) => {
                storage.createBlobService().deleteBlobIfExists(process.env.AZURE_BLOB_STORAGE, oriBlob, (err, result, res) => __awaiter(this, void 0, void 0, function* () {
                    if (err)
                        return reject(false);
                    return resolve(true);
                }));
            });
        }
    }
});
