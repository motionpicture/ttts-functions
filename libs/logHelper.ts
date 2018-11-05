import * as fs from 'fs';
import * as moment from 'moment';
import * as storage from 'azure-storage';
import * as configs from '../configs/app.js';

//Logファイルを書く
const writeLog = async (type: string, text: any) => {
    const localFile = `${__dirname}/../logs/${type}-${moment().format("YYYYMMDD")}.log`;
    const targetBlob = `logs/${type}-${moment().format("YYYYMMDD")}.log`;
    let stream: any = '';

    await storage.createBlobService().getBlobToStream(configs.containerName, targetBlob, await fs.createWriteStream(localFile), async (error, result, res) => {
        if (error) {
            stream = await fs.createWriteStream(localFile);
        } else {
            stream = await fs.createWriteStream(localFile, {flags:'a'});
        }

        stream.write(`${moment().format()}: ${text}` + "\n");
        stream.end();

        // // Storageにファイルを遷移
        await stream.on('finish', async () => {
            await storage.createBlobService().createBlockBlobFromLocalFile(configs.containerName, targetBlob, localFile, async function(error, result, response) {
                if (!error) {
                    fs.unlink(localFile, () => {});
                }
            });
        });
    });
}

module.exports.writeInfoLog = async (text: any) => {
    await writeLog('info', text);
}


module.exports.writeErrorLog = async (context: any, text: any) => {
    await writeLog('error', text);
    await writeTableLog(context, text);
}

const writeTableLog = async (context: any, error: any) => {
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
    const saveError: any = async (entity: any) => {
        return new Promise((resolve, reject) => {
            tableService.insertOrReplaceEntity(tableName, entity, function(error) {
                if (error) reject(error);
                else resolve(true);
            });
        });
    }

    await saveError(entity);
}