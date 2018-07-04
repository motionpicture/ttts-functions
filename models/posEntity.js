//SQL Server
class PosSales {
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

    set id(id) {
        this._id = id;
    }

    get id() {
        return this._id;
    }

    set store_code(store_code) {
        this._store_code = store_code;
    }

    get store_code() {
        return this._store_code;
    }

    set pos_no(pos_no) {
        this._pos_no = pos_no ? parseInt(pos_no) : null;
    }

    get pos_no() {
        return this._pos_no;
    }

    set receipt_no(receipt_no) {
        this._receipt_no = receipt_no;
    }

    get receipt_no() {
        return this._receipt_no;
    }

    set no1(no1) {
        this._no1 = no1 ? parseInt(no1) : null;
    }

    get no1() {
        return this._no1;
    }

    set no2(no2) {
        this._no2 = no2 ? parseInt(no2) : '';
    }

    get no2() {
        return this._no2;
    }

    set type(type) {
        this._type = type ? parseInt(type) : null;
    }

    get type() {
        return this._type;
    }

    set payment_no(payment_no) {
        this._payment_no = payment_no;
    }

    get payment_no() {
        return this._payment_no;
    }

    set performance_id(performance_id) {
        this._performance_id = performance_id ? parseInt(performance_id) : null;
    }

    get performance_id() {
        return this._performance_id;
    }

    set seat_code(seat_code) {
        this._seat_code = seat_code;
    }

    get seat_code() {
        return this._seat_code;
    }

    set performance_type(performance_type) {
        this._performance_type = performance_type ? parseInt(performance_type) : null;
    }

    get performance_type() {
        return this._performance_type;
    }

    set performance_day(performance_day) {
        this._performance_day = performance_day;
    }

    get performance_day() {
        return this._performance_day;
    }

    set start_time(start_time) {
        this._start_time = start_time;
    }

    get start_time() {
        return this._start_time;
    }

    set sales_date(sales_date) {
        this._sales_date = sales_date;
    }

    get sales_date() {
        return this._sales_date;
    }

    set section_code(section_code) {
        this._section_code = section_code;
    }

    get section_code() {
        return this._section_code;
    }

    set plu_code(plu_code) {
        this._plu_code = plu_code;
    }

    get plu_code() {
        return this._plu_code;
    }

    set item_name(item_name) {
        this._item_name = item_name;
    }

    get item_name() {
        return this._item_name;
    }

    set sales_amount(sales_amount) {
        this._sales_amount = sales_amount ? parseInt(sales_amount) : null;
    }

    get sales_amount() {
        return this._sales_amount;
    }

    set unit_price(unit_price) {
        this._unit_price = unit_price ? parseInt(unit_price) : null;
    }

    get unit_price() {
        return this._unit_price;
    }

    set unit(unit) {
        this._unit = unit ? parseInt(unit) : null;
    }

    get unit() {
        return this._unit;
    }

    set sum_amount(sum_amount) {
        this._sum_amount = sum_amount ? parseInt(sum_amount) : null;
    }

    get sum_amount() {
        return this._sum_amount;
    }

    set payment_type(payment_type) {
        this._payment_type = payment_type ? parseInt(payment_type) : null;
    }

    get payment_type() {
        return this._payment_type;
    }

    set cash(cash) {
        this._cash = cash ? parseInt(cash) : null;
    }

    get cash() {
        return this._cash;
    }

    set payment_type1(payment_type1) {
        this._payment_type1 = payment_type1 ? parseInt(payment_type1) : null;
    }

    get payment_type1() {
        return this._payment_type1;
    }

    set payment_type2(payment_type2) {
        this._payment_type2 = payment_type2 ? parseInt(payment_type2) : null;
    }

    get payment_type2() {
        return this._payment_type2;
    }

    set payment_type3(payment_type3) {
        this._payment_type3 = payment_type3 ? parseInt(payment_type3) : null;
    }

    get payment_type3() {
        return this._payment_type3;
    }

    set payment_type4(payment_type4) {
        this._payment_type4 = payment_type4 ? parseInt(payment_type4) : null;
    }

    get payment_type4() {
        return this._payment_type4;
    }

    set payment_type5(payment_type5) {
        this._payment_type5 = payment_type5 ? parseInt(payment_type5) : null;
    }

    get payment_type5() {
        return this._payment_type5;
    }

    set payment_type6(payment_type6) {
        this._payment_type6 = payment_type6 ? parseInt(payment_type6) : null;
    }

    get payment_type6() {
        return this._payment_type6;
    }

    set payment_type7(payment_type7) {
        this._payment_type7 = payment_type7 ? parseInt(payment_type7) : null;
    }

    get payment_type7() {
        return this._payment_type7;
    }

    set payment_type8(payment_type8) {
        this._payment_type8 = payment_type8 ? parseInt(payment_type8) : null;
    }

    get payment_type8() {
        return this._payment_type8;
    }

    set customer1(customer1) {
        this._customer1 = customer1 ? parseInt(customer1) : null;
    }

    get customer1() {
        return this._customer1;
    }

    set customer2(customer2) {
        this._customer2 = customer2;
    }

    get customer2() {
        return this._customer2;
    }

    set entry_flg(entry_flg) {
        this._entry_flg = entry_flg;
    }

    get entry_flg() {
        return this._entry_flg;
    }

    set entry_date(entry_date) {
        this._entry_date = entry_date;
    }

    get entry_date() {
        return this._entry_date;
    }
}

module.exports = PosSales;