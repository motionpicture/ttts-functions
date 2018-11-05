"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
//使用するモジュール
const sql = require("mssql");
const moment = require("moment");
const yaml = require("js-yaml");
const fs = require("fs");
const configs = require("../configs/app.js");
const Logs = require("../libs/logHelper");
const posSalesRepository = {
    /**
     * Get table infomation
     */
    getTblInfo: (context) => __awaiter(this, void 0, void 0, function* () {
        let attrs = {};
        const server = new sql.ConnectionPool(configs.mssql);
        yield server.connect().then(pool => {
            return pool.query `
                SELECT c.name AS name, t.Name AS type, c.max_length AS length
                FROM sys.columns c
                INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
                WHERE c.object_id = OBJECT_ID('pos_sales')`;
        }).then(result => {
            context.log(`${context.bindingData.name}ファイル: Connected sql server get table information.`);
            result.recordset.forEach(doc => {
                let prop = { type: doc.type, length: doc.length };
                switch (doc.type) {
                    case 'bigint':
                        prop.type = 'number';
                        prop.length = { min: Math.pow(-2, 63), max: Math.pow(2, 63) - 1 };
                        break;
                    case 'int':
                        prop.type = 'number';
                        prop.length = { min: Math.pow(-2, 31), max: Math.pow(2, 31) - 1 };
                        break;
                    case 'smallint':
                        prop.type = 'number';
                        prop.length = { min: Math.pow(-2, 15), max: Math.pow(2, 15) - 1 };
                        break;
                    case 'tinyint':
                        prop.type = 'number';
                        prop.length = { min: 0, max: 255 };
                        break;
                    case 'varchar':
                        prop.type = 'string';
                        break;
                }
                attrs[doc.name] = prop;
            });
        }).catch(err => {
            context.log(`${context.bindingData.name}ファイル: Connected sql server error.`);
        });
        server.close();
        return attrs;
    }),
    validation: (entities, context) => __awaiter(this, void 0, void 0, function* () {
        let errors = [];
        const attrs = yield posSalesRepository.getTblInfo(context);
        for (let i = 0; i < entities.length; i++) {
            let errorsInRow = [];
            for (const prop in entities[i]) {
                if (entities[i][prop] == null || entities[i][prop] == '')
                    continue;
                if (attrs[prop].type == 'number' && !(parseInt(entities[i][prop]) <= attrs[prop].length.max && parseInt(entities[i][prop]) >= attrs[prop].length.min)) {
                    errorsInRow.push(prop);
                }
                if (attrs[prop].type == 'string' && entities[i][prop].length > attrs[prop].length) {
                    errorsInRow.push(prop);
                }
                if (attrs[prop].type == 'time' && moment(entities[i][prop], 'h:mm:ss').isValid() == false) {
                    errorsInRow.push(prop);
                }
                if ((attrs[prop].type == 'date' || attrs[prop].type == 'datetime') && moment(entities[i][prop], 'YYYY/MM/DD h:mm:ss').isValid() == false) {
                    errorsInRow.push(prop);
                }
            }
            if (errorsInRow.length > 0)
                errors.push(`${context.bindingData.name}ファイルの${i + 1}行目の${errorsInRow.join('、')}値は正しくないです。`);
        }
        return errors;
    }),
    /**
     * Initialize object from data that read in csv file
     * @param rows Array [[x,x,x,x,...], [x,x,x,x,...], [x,x,x,x,...]]
     */
    getPosSales: (rows) => __awaiter(this, void 0, void 0, function* () {
        //Read the column information of csv file
        const csvPath = `${__dirname}/../configs/pos_sales.csv.yml`;
        const header = Object.getOwnPropertyNames(yaml.safeLoad(fs.readFileSync(csvPath, 'utf8')));
        //Return the array of pos_sales objects that will be used to store in database
        return rows.map(row => {
            let entity = new PosSalesEntity();
            header.forEach(r => entity[r] = row.shift());
            return entity;
        });
    }),
    /**
     * Set entry_flg and entry_date values to proceed to save to clipboard
     * @param entities [PosSalesEntity1, PosSalesEntity2, ...]
     * @param reservations object {(doc.payment_no + doc.seat_code + doc.performance_day): xxx, ...}
     */
    setCheckins: (entities, reservations) => __awaiter(this, void 0, void 0, function* () {
        return entities.map(entity => {
            let performance_day = null;
            if (entity.performance_day) {
                performance_day = moment(entity.performance_day, "YYYY/MM/DD HH:mm:ss").format("YYYYMMDD");
            }
            const prop = entity.payment_no + entity.seat_code + performance_day;
            if (reservations[prop] !== undefined) {
                entity.entry_flg = reservations[prop].entry_flg;
                entity.entry_date = reservations[prop].entry_date;
            }
            return entity;
        });
    }),
    /**
     * Saves data to clipboard in database to merge faster
     * @param entities [PosSalesEntity1, PosSalesEntity2, ...]
     * @param context Azure function of variable
     */
    saveToPosSales: (entities, context) => __awaiter(this, void 0, void 0, function* () {
        const header4PosSalesTmp = [
            'store_code', 'pos_no', 'receipt_no', 'no1', 'no2', 'type', 'payment_no', 'performance_id', 'seat_code',
            'performance_type', 'performance_day', 'start_time', 'sales_date', 'section_code', 'plu_code', 'item_name',
            'sales_amount', 'unit_price', 'unit', 'sum_amount', 'payment_type', 'cash', 'payment_type1', 'payment_type2',
            'payment_type3', 'payment_type4', 'payment_type5', 'payment_type6', 'payment_type7', 'payment_type8',
            'customer1', 'customer2', 'entry_flg', 'entry_date', 'uuid'
        ];
        entities = entities.map(entity => {
            let posSalesTmp = entity;
            posSalesTmp['uuid'] = context.funcId;
            let props = [];
            header4PosSalesTmp.forEach(x => props.push((posSalesTmp[x] !== null && posSalesTmp[x] !== '') ? `'${posSalesTmp[x]}'` : `NULL`));
            return `(${props.join(',')})`;
        });
        let parts = [[]];
        for (let x in entities) {
            if (parts[parts.length - 1].length < configs.maxRecordExec) {
                parts[parts.length - 1].push(entities[x]);
            }
            else
                parts.push([entities[x]]);
        }
        const server = new sql.ConnectionPool(configs.mssql);
        yield server.connect().then((pool) => __awaiter(this, void 0, void 0, function* () {
            context.log(`${context.bindingData.name}: Start Transaction.`);
            const transaction = new sql.Transaction(pool);
            yield transaction.begin();
            try {
                for (let i = 0; i < parts.length; i++) {
                    const request = new sql.Request(transaction);
                    yield request.query(`INSERT INTO pos_sales_tmp (${header4PosSalesTmp.join(',')}) VALUES ${parts[i].join(', ')};`);
                    context.log(`${context.bindingData.name}ファイル: ${i + 1}分割追加しました。`);
                }
                yield transaction.commit();
            }
            catch (err) {
                yield transaction.rollback();
                Logs.writeErrorLog(context, context.bindingData.name + '\\' + err.stack);
            }
        })).then(result => {
            context.log(`${context.bindingData.name}ファイル: インサートしました。`);
        });
        server.close();
    }),
    /**
     * If not already added, If it exists update
     */
    mergeFunc: (context) => __awaiter(this, void 0, void 0, function* () {
        let mergeSuccess = false;
        const currentTime = moment().format("YYYY-MM-DD HH:mm:ss");
        const commonCols = [
            'store_code', 'pos_no', 'receipt_no', 'no1', 'no2', 'type', 'payment_no', 'performance_id', 'seat_code',
            'performance_type', 'performance_day', 'start_time', 'sales_date', 'section_code', 'plu_code', 'item_name',
            'sales_amount', 'unit_price', 'unit', 'sum_amount', 'payment_type', 'cash', 'payment_type1', 'payment_type2',
            'payment_type3', 'payment_type4', 'payment_type5', 'payment_type6', 'payment_type7', 'payment_type8',
            'customer1', 'customer2', 'entry_flg', 'entry_date'
        ];
        let mergeCols = [];
        commonCols.forEach(col => mergeCols.push(`${col} = src.${col}`));
        const server = new sql.ConnectionPool(configs.mssql);
        yield server.connect().then((pool) => __awaiter(this, void 0, void 0, function* () {
            yield new sql.Request(pool).query(`
                INSERT pos_sales (${[...commonCols, ...['created_at']].join(',')})  
                SELECT ${[...commonCols, ...[`'${currentTime}'`]].join(',')} 
                FROM pos_sales_tmp   
                WHERE NOT EXISTS (
                    SELECT * FROM pos_sales ps 
                    WHERE IsNull(ps.payment_no, '') = IsNull(pos_sales_tmp.payment_no, '') 
                        AND IsNull(ps.seat_code, '') = IsNull(pos_sales_tmp.seat_code, '') 
                        AND IsNull(ps.performance_day, '') = IsNull(pos_sales_tmp.performance_day, '') 
                        AND IsNull(ps.receipt_no, '') = IsNull(pos_sales_tmp.receipt_no, '') 
                        AND IsNull(ps.no1, '') = IsNull(pos_sales_tmp.no1, '')
                ) AND pos_sales_tmp.uuid = '${context.funcId}';`);
            yield new sql.Request(pool).query(`
                UPDATE tgt 
                SET ${[...mergeCols, ...[`updated_at = '${currentTime}'`]].join(',')}
                FROM dbo.pos_sales AS tgt
                INNER JOIN pos_sales_tmp AS src ON (
                    src.uuid = '${context.funcId}' 
                    AND IsNull(tgt.payment_no, '') = IsNull(src.payment_no, '')
                    AND IsNull(tgt.seat_code, '') = IsNull(src.seat_code, '') 
                    AND IsNull(tgt.performance_day, '') = IsNull(src.performance_day, '')
                    AND IsNull(tgt.receipt_no, '') = IsNull(src.receipt_no, '')
                    AND IsNull(tgt.no1, '') = IsNull(src.no1, '')
                );`);
            yield new sql.Request(pool).query(`DELETE FROM pos_sales_tmp WHERE uuid = '${context.funcId}';`);
        })).then((result) => __awaiter(this, void 0, void 0, function* () {
            mergeSuccess = true;
            context.log(`${context.bindingData.name}ファイル: マージしました。`);
        })).catch(err => {
            mergeSuccess = false;
            context.log(`${context.bindingData.name}ファイル: マージ分はエラーが出ています。`);
            Logs.writeErrorLog(context, `${context.bindingData.name}ファイル` + "\n" + err.stack);
        });
        server.close();
        return mergeSuccess;
    }),
    /**
     * connect into SQL server to get datas had performance_day in period supplied on link
     * @param conditions {form: '20130301', to: '20130302'}
     * @param context Azure function of variable
     */
    searchPosSales: (conditions, context) => __awaiter(this, void 0, void 0, function* () {
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
        return yield sql.connect(configs.mssql).then((connection) => __awaiter(this, void 0, void 0, function* () {
            return yield connection.request().query(sqlString).then(docs => {
                connection.close();
                return docs.recordset.map(doc => {
                    return { $and: [
                            { payment_no: doc.payment_no },
                            { seat_code: doc.seat_code },
                            { performance_day: moment(doc.performance_day).format('YYYYMMDD') }
                        ] };
                });
            });
        }));
    }),
    /**
     * Update the checkins value in sql server, used for update_function
     * @param entities [entity1, entity2, entity3]
     * @param context Azure function of variable
     */
    reUpdateCheckins: (entities, context) => __awaiter(this, void 0, void 0, function* () {
        const updated_at = moment().format("YYYY-MM-DD HH:mm:ss");
        let updateSql = `
            UPDATE tgt
            SET entry_flg = src.entry_flg, entry_date = src.entry_date, updated_at = '${updated_at}'
            FROM dbo.pos_sales AS tgt
            INNER JOIN (
                VALUES ${entities.join(',')}
            ) AS src (payment_no, seat_code, performance_day, entry_flg, entry_date) 
            ON (tgt.payment_no = src.payment_no AND tgt.seat_code = src.seat_code AND tgt.performance_day = src.performance_day);`;
        sql.close();
        yield sql.connect(configs.mssql).then((connection) => __awaiter(this, void 0, void 0, function* () {
            connection.request().query(updateSql).then(() => {
                context.log(`更新しました!`);
                connection.close();
            });
        }));
    })
};
module.exports = posSalesRepository;
//SQL Server
class PosSalesEntity {
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
//SQL Server
class PosSalesTmpEntity {
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
        //uuid
        this.uuid = null;
    }
}
