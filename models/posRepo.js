var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
//使用するモジュール
const sql = require('mssql');
const PosSales = require('./posEntity.js');
const configs = require('../configs/app.js');
//カラムを更新
const getPosSales = (header, rows) => __awaiter(this, void 0, void 0, function* () {
    //エンティティを作成
    let entities = rows.map((row) => {
        let entity = new PosSales();
        header.forEach(r => entity[r] = row.shift());
        return entity;
    });
    return entities;
});
//データを保存
const insertPosSales = (entities) => __awaiter(this, void 0, void 0, function* () {
    for (var x in entities) {
        var data = [];
        for (var y in entities[x]) {
            if (entities[x][y] != null) {
                if (Number.isInteger(entities[x][y])) {
                    data.push('@' + y.replace('_', '') + ' = ' + entities[x][y]);
                }
                else {
                    data.push('@' + y.replace('_', '') + ' = ' + `'${entities[x][y]}'`);
                }
            }
        }
        try {
            //エンティティを保存する
            const pool = yield sql.connect(configs.mssql);
            yield pool.request().query(`EXEC dbo.mergePosSales ${data.join(', ')}`);
        }
        catch (error) {
            //Logファイルにバグを書く
        }
        finally {
            sql.close();
        }
    }
});
//輸出
module.exports.getPosSales = getPosSales;
module.exports.insertPosSales = insertPosSales;
