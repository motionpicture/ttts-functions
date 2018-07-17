//使用するモジュール
import * as sql from 'mssql';
import * as moment from 'moment';
import * as yaml from 'js-yaml';
import * as fs from 'fs';

const configs  = require('../configs/app.js');
const Logs = require("../libs/logHelper");

const posSalesRepository = {

    exec: async (sqlString) => {
        let result: any;
    
        try {
            const pool = await new sql.ConnectionPool(configs.mssql).connect();
            const result = await pool.request().query(sqlString);
    
            pool.close();
            return result;
        } catch (error) {
            Logs.writeErrorLog(error.stack);
        }
    },
    
    /**
     * Initialize object from data that read in csv file
     * 
     * @param rows Array [[x,x,x,x,...], [x,x,x,x,...], [x,x,x,x,...]]
     * @author sonph
     * @since 2018/07/15
     */
    getPosSales: async (rows: any) => {

        //Read the column information of csv file
        const csvPath = `${__dirname}/../configs/pos_sales.csv.yml`;
        const header = Object.getOwnPropertyNames(yaml.safeLoad(fs.readFileSync(csvPath, 'utf8')));
    
        //Return the array of pos_sales objects that will be used to store in database
        return rows.map(row => {
            let entity = new PosSalesEntity();
            header.forEach(r => entity[r] = row.shift());
            return entity;
        });
    },

    saveToPosSalesTmp: async (entities: any) => {
        
        //Read the column information of csv file
        const csvPath = `${__dirname}/../configs/pos_sales.csv.yml`;
        const header = Object.getOwnPropertyNames(yaml.safeLoad(fs.readFileSync(csvPath, 'utf8')));
        
        entities = entities.map( entity => {
            let props = [];
            header.forEach( x => props.push(`'${entity[x] !== null ? entity[x] : ''}'`));
            return `SELECT ${props.join(',')}`;
        });
        let tmp = [];
        for (let i = 0; i < 1400; i++) tmp.push(entities[i]); 
        entities = tmp;

        let parts = [[]];
        for (let x in entities) {
            if (parts[parts.length - 1].length < configs.maxRecordExec) {
                parts[parts.length - 1].push(entities[x]);
            } else parts.push([entities[x]]);
        }

        const connection = await sql.connect(configs.mssql);
        const threadings = posSalesRepository.getMuiltiThreading(parts, {header: header, connect: connection});
        await Promise.all(threadings).then((values) => {
            connection.close();
        });
    },

    getMuiltiThreading: (parts: any, options: any) => {
        const promises = [];
        for (let i = 0; i < parts.length; i++) {

            const threading = new Promise( async (resolve, reject) => {
                const sqlString = `INSERT INTO pos_sales_tmp (${options.header.join(',')}) ${parts[i].join(' UNION ALL ')};`;
                options.connect.request().query(sqlString).then(() => {
                    console.log(`connected ${i} end!`);
                    resolve(true);
                });
            })
            promises.push(threading);
        }
        return promises;
    },

    updateCheckins: async (entities: any, reservations: any) => {

        entities.map (entity => {
            const prop = entity.payment_no + entity.seat_code + entity.performance_day;
            if (reservations[prop] !== undefined) {
                entity.entry_flg = reservations[prop].entry_flg;
                entity.entry_date = reservations[prop].entry_date;
            }
            return entity;
        });

        return entities;
    },
    
    insertPosSales: async (entities) => {
        for (var x in entities) {
            var data = [];
            for (var y in entities[x]) {
                if (entities[x][y] != null) {
                    data.push('@' + y + ' = ' + `'${entities[x][y]}'`);
                }
            }
    
            await this.exec(`EXEC dbo.mergePosSales ${data.join(', ')}`);
        }
    },
    
    countListPosSales: async (condition: any) => {
        const sqlCount = `
            SELECT COUNT(*) AS length
            FROM pos_sales 
            WHERE entry_date BETWEEN '${condition.from}' AND '${condition.to}';`;
        
        const result: any = await this.exec(sqlCount);
        return result.recordset[0].length;
    },
    
    getListPosSales: async (condition: any, limit: any) => {
        const t: any[] = [];
    
        let sqlString = `
            SELECT id, payment_no, seat_code, performance_day 
            FROM pos_sales 
            WHERE entry_date BETWEEN '${condition.from}' AND '${condition.to}'
            `;
    
        if (limit !== undefined) {
            sqlString += `ORDER BY id ASC OFFSET ${limit.offset} ROWS FETCH NEXT ${limit.limit} ROWS ONLY;`;
        }
        
        const result = await this.exec(sqlString);
        if (result.recordset.length > 0) {
            result.recordset.map(record => {
                t.push(record);
            });
        }
    
        return t;
    },
    
    updateListPosSales: async (reservations: any[]) => {
    
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
    
        await this.exec(sqlString);
    }
}
module.exports = posSalesRepository;

//SQL Server
class PosSalesEntity {
    private id: number;
    private store_code: string;
    private pos_no: number;
    private receipt_no: string;
    private no1: number;
    private no2: number;
    private type: number;
    private payment_no: string;
    private performance_id: number;
    private seat_code: string;
    private performance_type: number;
    private performance_day: string;
    private start_time: string;
    private sales_date: string;
    private section_code: string;
    private plu_code: string;
    private item_name: string;
    private sales_amount: number;
    private unit_price: number;
    private unit: number;
    private sum_amount: number;
    private payment_type: number;
    private cash: number;
    private payment_type1: number;
    private payment_type2: number;
    private payment_type3: number;
    private payment_type4: number;
    private payment_type5: number;
    private payment_type6: number;
    private payment_type7: number;
    private payment_type8: number;
    private customer1: number;
    private customer2: string;
    private entry_flg: string;
    private entry_date: string;

    constructor() {
        //番号
        this.id = null;
        //店舗ｺｰﾄﾞ
        this.store_code = null;
        //POS番号
        this.pos_no = null;
        //ﾚｼｰﾄ番号
        this.receipt_no = null;
        //ﾚｼｰﾄ番号
        this.no1 = null;
        //連番
        this.no2 = null;
        //取引区分
        this.type = null;
        //購入番号
        this.payment_no = null;
        //ﾊﾟﾌｫｰﾏﾝｽID
        this.performance_id = null;
        //座席番号
        this.seat_code = null;
        //予約区分
        this.performance_type = null;
        //予約日付
        this.performance_day = null;
        //開始時間
        this.start_time = null;
        //売上日付
        this.sales_date = null;
        //部門ｺｰﾄﾞ
        this.section_code = null;
        //PLUｺｰﾄﾞ
        this.plu_code = null;
        //商品名
        this.item_name = null;
        //標準売価
        this.sales_amount = null;
        //単価
        this.unit_price = null;
        //数量
        this.unit = null;
        //合計金額
        this.sum_amount = null;
        //支払種別
        this.payment_type = null;
        //現金売上
        this.cash = null;
        //支払種別売上1
        this.payment_type1 = null;
        //支払種別売上2
        this.payment_type2 = null;
        //支払種別売上3
        this.payment_type3 = null;
        //支払種別売上4
        this.payment_type4 = null;
        //支払種別売上5
        this.payment_type5 = null;
        //支払種別売上6
        this.payment_type6 = null;
        //支払種別売上7
        this.payment_type7 = null;
        //支払種別売上8
        this.payment_type8 = null;
        //客世代
        this.customer1 = null;
        //客層名
        this.customer2 = null;
        //入場フラグ
        this.entry_flg = null;
        //入場日時
        this.entry_date = null;
    }
}