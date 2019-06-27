"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const safe = { j: 1, w: 'majority', wtimeout: 10000 };

/**
 * 予約スキーマ
 */
const schema = new mongoose.Schema({
    _id: String,
    seat_code: { //fsdfsdfs
        type: String,
        required: true
    },
    performance_day: String, //fsfasdf
    order_number: String, //fsfasdf
    payment_no: String, //fsfsfdsfd
    checkins: { ///sfdsfasdf
        type: [{
                _id: false,
                when: Date,
                where: String,
                why: String,
                how: String // どうやって
            }],
        default: []
    },
}, {
    collection: 'reservations',
    id: true,
    read: 'primaryPreferred',
    safe: safe,
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    },
    toJSON: { getters: true },
    toObject: { getters: true }
});

exports.default = mongoose.model('Reservation', schema)
    .on('index', (error) => {
    // tslint:disable-next-line:no-single-line-block-comment
    /* istanbul ignore next */
    if (error !== undefined) {
        console.error(error);
    }
});
