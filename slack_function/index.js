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
const client2Slack = require("request");
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}
module.exports = (context, req) => __awaiter(this, void 0, void 0, function* () {
    let message = req.query.message || (req.body && req.body.message);
    let options = {
        uri: process.env.SLACK_WEBHOOK_URI,
        headers: { "Content-type": "application/json" },
        json: {
            //https://api.slack.com/docs/message-attachmentsを参照
            attachments: [
                { text: message, color: 'danger' }
            ]
        }
    };
    yield client2Slack.post(options, (error, response, body) => __awaiter(this, void 0, void 0, function* () { }));
});
