//使用するモジュール
const sql = require('mssql');
const PosSales = require('./posEntity.js');
const configs  = require('../configs/app.js');

//カラムを更新
const insertPosSales = async (header, rows) => {
    
    //エンティティを作成
    let entities = rows.map(
        (row) => {
            let entity = new PosSales();
            header.forEach(r => entity[r] = row.shift());
            return entity;
        }
    );

    for (var x in entities) {
        var cols = [], vals = [];
        for (var y in entities[x]) {
            if (entities[x][y] != null) {
                cols.push(y.replace('_', ''));

                if (Number.isInteger(entities[x][y])) {
                    vals.push(entities[x][y]);
                } else {
                    vals.push(`'${entities[x][y]}'`);
                }
            }
        }

        try {
            //エンティティを保存する
            const pool = await sql.connect(configs.mssql);
            await pool.request().query(`INSERT INTO pos_sales(${cols.join(',')}) VALUES (${vals.join(',')});`);
        } catch (error) {
            //Logファイルにバグを書く
        } finally {
            sql.close();
        }
    }
}

//輸出
module.exports.insertPosSales = insertPosSales;