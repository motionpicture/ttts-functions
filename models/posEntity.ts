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

module.exports = PosSalesEntity;