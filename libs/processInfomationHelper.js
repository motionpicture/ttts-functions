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
const csv = require("fast-csv");
const moment = require("moment");
const Logs = require("../libs/logHelper");
const host = require(`../host.json`);
class default_1 {
    constructor() {
        this.createCsv = (context) => {
            this.filename = `${__dirname}/../logs/${context.bindingData.name}-process.log`;
            this.addFileInfo(context);
        }
            , this.checkProcess = (context) => __awaiter(this, void 0, void 0, function* () {
                let canRun = true;
                const files = fs.readdirSync(`${__dirname}/../logs/`);
                for (let i = 0; i < files.length; i++) {
                    if (files[i].includes('-process.log') == true) {
                        const fileName = `${__dirname}/../logs/${files[i]}`;
                        const logInfo = yield this.readFileInfo(fileName);
                        const maxTime = moment.duration(host.functionTimeout).asSeconds();
                        const lastTime = parseFloat(logInfo[logInfo.length - 1][2]);
                        const nowTime = moment.duration(moment(moment().toISOString()).diff(moment(logInfo[5][1]))).asSeconds();
                        if (lastTime / maxTime >= 0.8 && nowTime >= maxTime) {
                            Logs.writeErrorLog(yield this.showTimeoutAlert(fileName));
                            canRun = false;
                        }
                    }
                }
                return canRun;
            })
            , this.removeCsv = (filePath) => {
                if (filePath != null) {
                    fs.unlink(filePath, () => { });
                }
                else if (this.getCsvFilePath()) {
                    fs.unlink(this.getCsvFilePath(), () => { });
                }
            }
            , this.getCsvFilePath = () => {
                return this.filename;
            }
            , this.readFileInfo = (filePath) => __awaiter(this, void 0, void 0, function* () {
                return yield new Promise((resolve, reject) => {
                    const fileName = (filePath == null ? this.getCsvFilePath() : filePath);
                    const readableStream = fs.createReadStream(fileName).pipe(csv.parse());
                    const docs = [];
                    readableStream.on('data', (record) => {
                        docs.push(record);
                    });
                    readableStream.on('end', () => {
                        return resolve(docs);
                    });
                });
            })
            , this.addTimeProcess = (context) => __awaiter(this, void 0, void 0, function* () {
                const data = yield this.readFileInfo(null);
                data.push([
                    'time', moment().toISOString(), moment.duration(moment(moment().toISOString()).diff(moment(context.bindingData.sys.utcNow))).asSeconds()
                ]);
                const ws = fs.createWriteStream(this.filename);
                return yield csv.write(data, { headers: true }).pipe(ws);
            })
            , this.addFileInfo = (context) => {
                const ws = fs.createWriteStream(this.filename);
                csv.write([
                    ['processId', context.funcId],
                    ['name', context.bindingData.name],
                    ['uri', context.bindingData.uri],
                    ['length', context.bindingData.properties.length],
                    ['methodName', context.bindingData.sys.methodName],
                    ['utcNow', context.bindingData.sys.utcNow],
                    ['time', moment().toISOString(), moment.duration(moment(moment().toISOString()).diff(moment(context.bindingData.sys.utcNow))).asSeconds()]
                ], { headers: true }).pipe(ws);
            }
            , this.showTimeoutAlert = (filePath) => __awaiter(this, void 0, void 0, function* () {
                const data = yield this.readFileInfo(filePath);
                this.removeCsv(filePath);
                return `${data[1][1]} File: [Error] Timeout value of ${host.functionTimeout} was exceeded by function: Functions.merge_function.`;
            });
    }
}
exports.default = default_1;
