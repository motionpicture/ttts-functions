const csv     = require('csvtojson');
const storage = require('azure-storage');
const yaml = require('js-yaml');
const fs   = require('fs');
const sprintf = require('sprintf-js').sprintf;
const request = require('request');
const ttts = require("@motionpicture/ttts-domain");
const mongooseConnectionOptions_1 = require("./configs/mongooseConnectionOptions");

const posEntity  = require('./models/posEntity.js');
const posRepo  = require('./models/posRepo.js');
const configs  = require('./configs/app.js');

if (configs.env !== 'production') {
    require('dotenv').load();
}

//【子課題】POSデータ集約
async function posBatch() {
    const filePath = await checkFile();
    if (!filePath) {
        //Logファイルにバグを書く
    } else {
        let rows = await csv({noheader: true, output: "csv"}).fromStream(request.get(filePath));

        const doc = yaml.safeLoad(fs.readFileSync('./configs/CSV/101.csv.yml', 'utf8'));
        const header = Object.getOwnPropertyNames(doc);

        if (configs.csv.csv_101.useHeader) {
            rows.shift();
        }

        //posRepo.insertPosSales(header, rows);
        ttts.mongoose.connect(process.env.MONGOLAB_URI, mongooseConnectionOptions_1.default);
    }
}

//validation file
function checkFile () {
    return new Promise(async resolve => {
        await storage.createBlobService().listBlobsSegmented(configs.container_name, null, (err, data) => {
            if (!err) {
                for (var x in data.entries) {
                    if (data.entries[x].name == configs.csv_working) {
                        resolve(filePath(configs.csv_working));
                    }
                }
            }
            resolve(false);
        });
    });
}

//ファイルURLを取得
var filePath = async (name) => {
    var cobj = {};
    process.env.AZURE_STORAGE_CONNECTION_STRING.split(';').forEach((item) => {
        var info = item.split('='); 
        cobj[info[0]] = info[1];
    });
    
    return sprintf("%s://%s.blob.%s/%s/%s", cobj.DefaultEndpointsProtocol, cobj.AccountName, cobj.EndpointSuffix, configs.container_name, name);
}

posBatch();