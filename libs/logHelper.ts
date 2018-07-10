import * as fs from 'fs';
import * as moment from 'moment';
import * as storage from 'azure-storage';
import * as configs from '../configs/app.js';

//Logファイルを書く
module.exports.writeErrorLog = async (text: any) => {
    const localFile = `${__dirname}/../logs/error-${moment().format("YYYYMMDD")}.log`;
    const targetBlob = `logs/error-${moment().format("YYYYMMDD")}.log`;
    let stream: any = '';

    await storage.createBlobService().getBlobToStream(configs.containerName, targetBlob, fs.createWriteStream(localFile), async (error, result, res) => {
        if (error) {
            stream = await fs.createWriteStream(localFile);
        } else {
            stream = await fs.createWriteStream(localFile, {flags:'a'});
        }

        stream.write(text.stack + "\n\n");
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
}