//使用するモジュール
const sql = require('mssql');
const PosSales = require('./posEntity.js');
const configs  = require('../configs/app.js');

//カラムを更新
const getPosSales = async (header, rows) => {
    
    //エンティティを作成
    let entities = rows.map(
        (row) => {
            let entity = new PosSales();
            header.forEach(r => entity[r] = row.shift());
            return entity;
        }
    );

    return entities;
}

//データを保存
const insertPosSales = async (entities) => {
    for (var x in entities) {
        var data = [];
        for (var y in entities[x]) {
            if (entities[x][y] != null) {

                if (Number.isInteger(entities[x][y])) {
                    data.push('@' + y.replace('_', '') + ' = ' + entities[x][y]);
                } else {
                    data.push('@' + y.replace('_', '') + ' = ' + `'${entities[x][y]}'`);
                }
            }
        }

        try {
            //エンティティを保存する
            const pool = await sql.connect(configs.mssql);
            await pool.request().query(`EXEC dbo.mergePosSales ${data.join(', ')}`);
        } catch (error) {
            //Logファイルにバグを書く
        } finally {
            sql.close();
        }
    }
}

//輸出
module.exports.getPosSales = getPosSales;
module.exports.insertPosSales = insertPosSales;