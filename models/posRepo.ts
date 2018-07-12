//使用するモジュール
const sql = require('mssql');
const PosSales = require('./posEntity.js');
const configs  = require('../configs/app.js');
const Logs = require("../libs/logHelper");

const exec = async (sqlString) => {
    let result: any;

    try {
        const pool = await new sql.ConnectionPool(configs.mssql).connect();
        const result = await pool.request().query(sqlString);

        pool.close();
        return result;
    } catch (error) {
        Logs.writeErrorLog(error.stack);
    }
}

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

        await exec(`EXEC dbo.mergePosSales ${data.join(', ')}`);
    }
}

//Posデーターの総数
const countListPosSales = async (condition: any) => {
    const sqlCount = `
        SELECT COUNT(*) AS length
        FROM pos_sales 
        WHERE entry_date BETWEEN '${condition.from}' AND '${condition.to}';`;
    
    const result: any = await exec(sqlCount);
    return result.recordset[0].length;
}

//Pos一覧をSQLserverに取得
const getListPosSales = async (condition: any, limit: any) => {
    const t: any[] = [];

    let sqlString = `
        SELECT id, payment_no, seat_code, performance_day 
        FROM pos_sales 
        WHERE entry_date BETWEEN '${condition.from}' AND '${condition.to}'
        `;

    if (limit !== undefined) {
        sqlString += `ORDER BY id ASC OFFSET ${limit.offset} ROWS FETCH NEXT ${limit.limit} ROWS ONLY;`;
    }
    
    const result = await exec(sqlString);
    if (result.recordset.length > 0) {
        result.recordset.map(record => {
            t.push(record);
        });
    }

    return t;
}

//pos_salesのデータを更新
const updateListPosSales = async (reservations: any[]) => {

    let dataString = [];
    reservations.forEach(r => {
        dataString.push(`('${r.payment_no}', '${r.seat_code}', '${r.performance_day}', '${r.entry_flg}', '${r.entry_date}')`);
    });

    let sqlString = `
        UPDATE tgt
        SET entry_flg = src.entry_flg, entry_date = src.entry_date
        FROM dbo.pos_sales AS tgt
        INNER JOIN (
            VALUES
            ${dataString.join(',')}
        ) AS src (payment_no, seat_code, performance_day, entry_flg, entry_date) 
        ON (tgt.payment_no = src.payment_no AND tgt.seat_code = src.seat_code AND tgt.performance_day = src.performance_day);
    `;

    await exec(sqlString);
} 

//輸出
module.exports.getPosSales = getPosSales;
module.exports.insertPosSales = insertPosSales;
module.exports.getListPosSales = getListPosSales;
module.exports.updateListPosSales = updateListPosSales;
module.exports.countListPosSales = countListPosSales;