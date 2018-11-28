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
const fs = require("fs");
const moment = require("moment");
const storage = require("azure-storage");
const configs = require("../configs/app.js");
//Logファイルを書く
const writeLog = (type, text) => __awaiter(this, void 0, void 0, function* () {
    const localFile = `${__dirname}/../logs/${type}-${moment().format("YYYYMMDD")}.log`;
    const targetBlob = `logs/${type}-${moment().format("YYYYMMDD")}.log`;
    let stream = '';
    yield storage.createBlobService().getBlobToStream(configs.containerName, targetBlob, yield fs.createWriteStream(localFile), (error, result, res) => __awaiter(this, void 0, void 0, function* () {
        if (error) {
            stream = yield fs.createWriteStream(localFile);
        }
        else {
            stream = yield fs.createWriteStream(localFile, { flags: 'a' });
        }
        stream.write(`${moment().format()}: ${text}` + "\n");
        stream.end();
        // // Storageにファイルを遷移
        yield stream.on('finish', () => __awaiter(this, void 0, void 0, function* () {
            yield storage.createBlobService().createBlockBlobFromLocalFile(configs.containerName, targetBlob, localFile, function (error, result, response) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (!error) {
                        fs.unlink(localFile, () => { });
                    }
                });
            });
        }));
    }));
});
module.exports.writeInfoLog = (text) => __awaiter(this, void 0, void 0, function* () {
    yield writeLog('info', text);
});
module.exports.writeErrorLog = (context, text) => __awaiter(this, void 0, void 0, function* () {
    yield writeLog('error', text);
    yield writeTableLog(context, text);
});
const writeTableLog = (context, error) => __awaiter(this, void 0, void 0, function* () {
    var entGen = storage.TableUtilities.entityGenerator;
    const tableService = storage.createTableService();
    const tableName = `AzureWebJobsHostLogs${moment(moment().toISOString()).format('YYYYMM')}`;
    var entity = {
        PartitionKey: entGen.String('I'),
        RowKey: entGen.String(`${context.executionContext.invocationId}`),
        ErrorDetails: entGen.String(error),
        EndTime: entGen.DateTime(new Date(moment().toISOString()))
    };
    //エラーのレコードをインサートする
    const saveError = (entity) => __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            tableService.insertOrReplaceEntity(tableName, entity, function (error) {
                if (error)
                    reject(error);
                else
                    resolve(true);
            });
        });
    });
    yield saveError(entity);
});
