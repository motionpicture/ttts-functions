import * as client2Slack from 'request';

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').load();
}

module.exports = async (context, req) => {
    let message: string = req.query.message || (req.body && req.body.message);
    let options = {
        uri: process.env.SLACK_WEBHOOK_URI,
        headers: { "Content-type": "application/json" },
        json: {
            //https://api.slack.com/docs/message-attachmentsを参照
            attachments: [
                {text: message, color: 'danger'}
            ]
        }
    };

    await client2Slack.post(options, async (error, response, body) => {});
}