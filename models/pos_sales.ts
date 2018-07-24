//使用するモジュール
import * as sql from 'mssql';
import * as moment from 'moment';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as configs from '../configs/app.js';

const posSalesRepository = {
    /**
     * Initialize object from data that read in csv file
     * @param rows Array [[x,x,x,x,...], [x,x,x,x,...], [x,x,x,x,...]]
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

    /**
     * Set entry_flg and entry_date values to proceed to save to clipboard
     * @param entities [PosSalesEntity1, PosSalesEntity2, ...]
     * @param reservations object {(doc.payment_no + doc.seat_code + doc.performance_day): xxx, ...}
     */
    setCheckins: async (entities: any, reservations: any) => {
        return entities.map (entity => {
            const prop = entity.payment_no + entity.seat_code + entity.performance_day;
            if (reservations[prop] !== undefined) {
                entity.entry_flg = reservations[prop].entry_flg;
                entity.entry_date = reservations[prop].entry_date;
            }
            return entity;
        });
    },

    /**
     * Saves data to clipboard in database to merge faster
     * @param entities [PosSalesEntity1, PosSalesEntity2, ...]
     * @param context Azure function of variable
     */
    saveToPosSalesTmp: async (entities: any, context) => {
        
        //Read the column information of csv file
        const csvPath = `${__dirname}/../configs/pos_sales.csv.yml`;
        const header = Object.getOwnPropertyNames(yaml.safeLoad(fs.readFileSync(csvPath, 'utf8')));
        header.push('entry_flg');
        header.push('entry_date');
        
        entities = entities.map( entity => {
            let props = [];
            header.forEach( x => props.push(entity[x] !== null ? `'${entity[x]}'`: `NULL`));
            return `(${props.join(',')})`;
        });

        let parts = [[]];
        for (let x in entities) {
            if (parts[parts.length - 1].length < configs.maxRecordExec) {
                parts[parts.length - 1].push(entities[x]);
            } else parts.push([entities[x]]);
        }

        sql.close();
        const connection = await sql.connect(configs.mssql);
        const options = {context: context, header: header, connect: connection};
        const threadings = posSalesRepository.getMuiltiThreading(parts, options);
        
        await Promise.all(threadings).then(async (values) => {
            await posSalesRepository.mergeFunc(options);
            connection.close();
        });
    },

    /**
     * Split into multiple processes to save data to the database faster
     * @param parts Array [string, string,...]
     * @param options object helper extra
     */
    getMuiltiThreading: (parts: any, options: any) => {
        const promises = [];
        for (let i = 0; i < parts.length; i++) {
            const threading = new Promise( async (resolve, reject) => {
                const sqlString = `INSERT INTO pos_sales_tmp (${options.header.join(',')}) VALUES ${parts[i].join(', ')};`;

                options.connect.request().query(sqlString).then(() => {
                    options.context.log(`${i + 1}分追加しました!`);
                    resolve(true);
                });
            });
            promises.push(threading);
        }
        return promises;
    },

    /**
     * Perform a new addition if the data does not exist and update if the data already exists
     * @param options object helper extra
     */
    mergeFunc: async (options) => {
        const insertSql = `
            INSERT pos_sales (${options.header.join(',')})  
            SELECT ${options.header.join(',')} 
            FROM pos_sales_tmp   
            WHERE NOT EXISTS (
                SELECT * FROM pos_sales ps 
                WHERE ps.payment_no = pos_sales_tmp.payment_no AND ps.seat_code = pos_sales_tmp.seat_code AND ps.performance_day = pos_sales_tmp.performance_day
            );
        `;
        await options.connect.request().query(insertSql);

        const updateSql = `
            UPDATE tgt 
                SET entry_flg = src.entry_flg, entry_date = src.entry_date 
                FROM dbo.pos_sales AS tgt
            INNER JOIN pos_sales_tmp AS src ON (tgt.payment_no = src.payment_no AND tgt.seat_code = src.seat_code AND tgt.performance_day = src.performance_day);
        `;
        await options.connect.request().query(updateSql);
        await options.connect.request().query(`TRUNCATE TABLE pos_sales_tmp;`);
    },

    /**
     * connect into SQL server to get datas had performance_day in period supplied on link
     * @param conditions {form: '20130301', to: '20130302'}
     * @param context Azure function of variable
     */
    searchPosSales: async (conditions, context) => {
        let sqlString = `
            SELECT id, payment_no, seat_code, performance_day 
            FROM pos_sales 
            WHERE 1 = 1`;
        
        if (conditions.from != null) {
            sqlString += ` AND performance_day >= '${conditions.from}'`;
        }
        if (conditions.to != null) {
            sqlString += ` AND performance_day <= '${conditions.to}'`;
        }

        sql.close();
        return await sql.connect(configs.mssql).then(async connection => {
            return await connection.request().query(sqlString).then(docs => {
                connection.close();
                return docs.recordset.map(doc => {
                    return { $and: [
                            { payment_no: doc.payment_no },
                            { seat_code: doc.seat_code },
                            { performance_day: moment(doc.performance_day).format('YYYYMMDD') }]}
                });
            });
        });
    },

    /**
     * Update the checkins value in sql server, used for update_function
     * @param entities [entity1, entity2, entity3]
     * @param context Azure function of variable
     */
    reUpdateCheckins: async (entities, context) => {
        let updateSql = `
            UPDATE tgt
            SET entry_flg = src.entry_flg, entry_date = src.entry_date
            FROM dbo.pos_sales AS tgt
            INNER JOIN (
                VALUES ${entities.join(',')}
            ) AS src (payment_no, seat_code, performance_day, entry_flg, entry_date) 
            ON (tgt.payment_no = src.payment_no AND tgt.seat_code = src.seat_code AND tgt.performance_day = src.performance_day);`;

        sql.close();
        await sql.connect(configs.mssql).then(async connection => {
            connection.request().query(updateSql).then(() => {
                context.log(`更新しました!`);
                connection.close();
            });
        });
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