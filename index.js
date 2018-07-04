const csv     = require('csvtojson');
const storage = require('azure-storage');
const yaml = require('js-yaml');
const fs   = require('fs');
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

    const files = await getListFileWorking();
    if (files.length === 0) {
        //Logファイルにバグを書く
    } else {
        const doc = yaml.safeLoad(fs.readFileSync('./configs/CSV/101.csv.yml', 'utf8'));
        const header = Object.getOwnPropertyNames(doc);
        
        const rows = [];
        for (var x in files) {
            await csv({noheader: true, output: "csv"})
                .fromStream(request.get(files[x]))
                .then(docs => {
                    if (configs.csv.csv_101.useHeader) docs.shift();
                    docs.forEach (doc => {
                        rows.push(doc);
                    });
                });
        }

        const entities = await posRepo.getPosSales(header, rows);
        ttts.mongoose.connect(process.env.MONGOLAB_URI, mongooseConnectionOptions_1.default);
        for (var x in entities) {
            try {
                const conditions = [
                    { payment_no: entities[x].payment_no },
                    { seat_code: entities[x].seat_code },
                    { performance_day: entities[x].performance_day }
                ];
    
                const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
                const reservations = await reservationRepo.reservationModel.find({ $and: conditions })
                .exec()
                .then(docs => docs.map(doc => doc.toObject()));;
    
                if (reservations.length > 1) break;
                if (reservations[0].checkins.length >= 1) {
                    entities[x].entry_flg = 'TRUE';
                    entities[x].entry_date = reservations[0].checkins[0].when.toISOString();
                } else {
                    entities[x].entry_flg = 'FALSE';
                }
            } catch (error) {
                //Logファイルにバグを書く
            }
        }

        ttts.mongoose.disconnect();

        await posRepo.insertPosSales(entities);
        await moveListFileWorking(files);
    }
}

//全部ファイルを遷移
function moveListFileWorking (files) {
    files.forEach( async file => {
        const pathArray = file.split('/');
        const oriBlob = 'working/' + pathArray[pathArray.length - 1];
        const targetBlob = 'complete/' + pathArray[pathArray.length - 1];
        
        await storage.createBlobService().startCopyBlob(file + '?sasString', configs.container_name, targetBlob, async (err, result, res) => {
            if (!err) {
                await storage.createBlobService().deleteBlobIfExists(configs.container_name, oriBlob, (err, result, res) => {
                    if (err) {
                        //Logファイルにバグを書く
                    }
                });
            } else {
                //Logファイルにバグを書く
            }
        });
    }); 
};

//ファイリ一覧を取得
function getListFileWorking () {
    return new Promise(async resolve => {
        await storage.createBlobService().listBlobsSegmented(configs.container_name, null, (err, data) => {
            var files = [];
            if (!err) {
                for (var x in data.entries) {
                    var invalid = data.entries[x].name.match(configs.csv_working);
                    if (invalid != null) files.push(directoryStorage + invalid[0]);
                }
            } else {
                //Logファイルにバグを書く
            }
            resolve(files);
        });
    });
}

//ファイルURLを取得
var filePath = () => {
    var cobj = {};
    process.env.AZURE_STORAGE_CONNECTION_STRING.split(';').forEach(item => {
        var info = item.split('='); 
        cobj[info[0]] = info[1];
    });

    return cobj.DefaultEndpointsProtocol + '://' + cobj.AccountName + '.blob.' + cobj.EndpointSuffix + '/' + configs.container_name + '/';
}

const directoryStorage = filePath();
posBatch();