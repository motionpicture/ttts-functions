import * as fs from 'fs';
import * as moment from 'moment';
import * as storage from 'azure-storage';
import * as configs from '../configs/app.js';
import * as slackFunc from 'request';

//Logファイルを書く
const writeLog = async (type: string, text: any) => {
    const localFile = `${__dirname}/../logs/${type}-${moment().format("YYYYMMDD")}.log`;
    const targetBlob = `logs/${type}-${moment().format("YYYYMMDD")}.log`;
    let stream: any = '';

    await storage.createBlobService().getBlobToStream(configs.containerName, targetBlob, fs.createWriteStream(localFile), async (error, result, res) => {
        if (error) {
            stream = await fs.createWriteStream(localFile);
        } else {
            stream = await fs.createWriteStream(localFile, {flags:'a'});
        }

        stream.write(`${moment().format()}: ${text}` + "\n");
        stream.end();

        //Storageにファイルを遷移
        stream.on('finish', () => {
            storage.createBlobService().createBlockBlobFromLocalFile(configs.containerName, targetBlob, localFile, function(error, result, response) {
                if (!error) {
                    fs.unlink(localFile, () => {});
                }
            });
        });
    });

    let options = {
        uri: process.env.SLACK_FUNCTION,
        headers: { "Content-type": "application/json" },
        json: {message: text}
    };

    await slackFunc.post(options, async (error, response, body) => {});
}

module.exports.writeInfoLog = async (text: any) => {
    writeLog('info', text);
}


module.exports.writeErrorLog = async (text: any) => {
    writeLog('error', text);
}