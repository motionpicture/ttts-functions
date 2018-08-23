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
const slackFunc = require("request");
//Logファイルを書く
const writeLog = (type, text) => __awaiter(this, void 0, void 0, function* () {
    const localFile = `${__dirname}/../logs/${type}-${moment().format("YYYYMMDD")}.log`;
    const targetBlob = `logs/${type}-${moment().format("YYYYMMDD")}.log`;
    let stream = '';
    yield storage.createBlobService().getBlobToStream(configs.containerName, targetBlob, fs.createWriteStream(localFile), (error, result, res) => __awaiter(this, void 0, void 0, function* () {
        if (error) {
            stream = yield fs.createWriteStream(localFile);
        }
        else {
            stream = yield fs.createWriteStream(localFile, { flags: 'a' });
        }
        stream.write(`${moment().format()}: ${text}` + "\n");
        stream.end();
        //Storageにファイルを遷移
        stream.on('finish', () => {
            storage.createBlobService().createBlockBlobFromLocalFile(configs.containerName, targetBlob, localFile, function (error, result, response) {
                if (!error) {
                    fs.unlink(localFile, () => { });
                }
            });
        });
    }));
    let options = {
        uri: process.env.SLACK_FUNCTION,
        headers: { "Content-type": "application/json" },
        json: { message: text }
    };
    yield slackFunc.post(options, (error, response, body) => __awaiter(this, void 0, void 0, function* () { }));
});
module.exports.writeInfoLog = (text) => __awaiter(this, void 0, void 0, function* () {
    writeLog('info', text);
});
module.exports.writeErrorLog = (text) => __awaiter(this, void 0, void 0, function* () {
    writeLog('error', text);
});
