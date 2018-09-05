import * as fs from 'fs';
import * as csv from 'fast-csv';
import * as moment from 'moment';
const Logs = require("../libs/logHelper");
const host = require(`../host.json`);

export default class {
    showTimeoutAlert: (filePath: string) => Promise<string>;
    checkProcess: (context: any) => Promise<boolean>;
    removeCsv: (filePath: string) => void;
    addTimeProcess: (context: any) => void;
    readFileInfo: (filePath: any) => any;
    addFileInfo: (context: any) => void;
    filename: string;
    getCsvFilePath: () => string;
    createCsv: (context: any) => void;

    constructor() {
        this.createCsv = (context) => {
            this.filename = `${__dirname}/../logs/${context.bindingData.name}-process.log`;
            this.addFileInfo(context);
        }
        , this.checkProcess = async (context) => {
            let canRun: boolean = true;
            const files = fs.readdirSync(`${__dirname}/../logs/`);

            for(let i = 0; i < files.length; i++) {
                if (files[i].includes('-process.log') == true) {

                    const fileName = `${__dirname}/../logs/${files[i]}`;
                    const logInfo = await this.readFileInfo(fileName);

                    const maxTime   = moment.duration(host.functionTimeout).asSeconds();
                    const lastTime  = parseFloat(logInfo[logInfo.length - 1][2]);
                    const nowTime   = moment.duration(moment(moment().toISOString()).diff(moment(logInfo[5][1]))).asSeconds();

                    if (lastTime / maxTime >= 0.8 || nowTime >= maxTime) {
                        Logs.writeErrorLog(await this.showTimeoutAlert(fileName));
                        canRun = false;
                    }
                }
            }

            return canRun;
        }
        , this.removeCsv = (filePath: string) => {
            if (filePath != null) {
                fs.unlink(filePath, () => {});
            } else if (this.getCsvFilePath()) {
                fs.unlink(this.getCsvFilePath(), () => {});
            }
        }
        , this.getCsvFilePath = () => {
            return this.filename;
        }
        , this.readFileInfo = async (filePath: string) => {
            return await new Promise((resolve ,reject) => {
                const fileName = (filePath == null ? this.getCsvFilePath(): filePath);
                const readableStream = fs.createReadStream(fileName).pipe(csv.parse());

                const docs = [];
                readableStream.on('data', (record) => {
                    docs.push(record);
                });

                readableStream.on('end', () => {
                    return resolve(docs);
                });
            });
        }
        , this.addTimeProcess = async (context) => {
            const data = await this.readFileInfo(null);
            data.push([
                'time', moment().toISOString(), moment.duration(moment(moment().toISOString()).diff(moment(context.bindingData.sys.utcNow))).asSeconds()
            ]);

            const ws = fs.createWriteStream(this.filename);
            return await csv.write(data, {headers: true}).pipe(ws);
        }
        , this.addFileInfo = (context) => {
            const ws = fs.createWriteStream(this.filename);
            csv.write([
                ['processId', context.funcId]
                , ['name', context.bindingData.name]
                , ['uri', context.bindingData.uri]
                , ['length', context.bindingData.properties.length]
                , ['methodName', context.bindingData.sys.methodName]
                , ['utcNow', context.bindingData.sys.utcNow]
                , ['time', moment().toISOString(), moment.duration(moment(moment().toISOString()).diff(moment(context.bindingData.sys.utcNow))).asSeconds() ]
            ], {headers: true}).pipe(ws);
        }
        , this.showTimeoutAlert = async (filePath: string) => {
            const data = await this.readFileInfo(filePath);
            this.removeCsv(filePath);
            return `${data[1][1]} File: [Error] Timeout value of ${host.functionTimeout} was exceeded by function: Functions.merge_function.`;
        }
    }
}

