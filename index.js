const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

app.get('/webhook', (req, res) => {
    if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
        res.status(200).send(req.query['hub.challenge']);
    } else {
        res.sendStatus(403);
    }
});

app.post('/webhook', async (req, res) => {
    const entry = req.body.entry ? req.body.entry[0] : null;
    const messaging = entry ? entry.messaging[0] : null;

    if (messaging && messaging.message) {
        const senderId = messaging.sender.id;
        // ইউজার কুইক রিপ্লাই ক্লিক করলে সেটি payload হিসেবে আসে, যা টেক্সট হিসেবে হ্যান্ডেল হবে
        const text = messaging.message.quick_reply ? messaging.message.quick_reply.payload : (messaging.message.text ? messaging.message.text.trim() : "");

        if (text.includes(',')) {
            const response = await axios.post(GOOGLE_APPS_SCRIPT_URL, { senderId, text, type: 'data' });
            await sendMessage(senderId, response.data.reply);
        }
        else if (['hi', 'hello', 'হাই', 'হ্যালো'].includes(text.toLowerCase())) {
            await sendQuickReply(senderId, "আমি আপনাকে কিভাবে সাহায্য করতে পারি?", [
                { title: "১. প্রতিনিধির সাথে যোগাযোগ", payload: "1" },
                { title: "২. আমাদের ওয়েবসাইট", payload: "2" }
            ]);
        }
        else if (text === '1' || text === '2') {
            const response = await axios.post(GOOGLE_APPS_SCRIPT_URL, { senderId, text, type: 'choice' });
            await sendMessage(senderId, response.data.reply);
        }
    }
    res.sendStatus(200);
});

async function sendMessage(senderId, text) {
    await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        recipient: { id: senderId },
        message: { text: text }
    });
}

async function sendQuickReply(senderId, text, options) {
    const quick_replies = options.map(opt => ({
        content_type: "text",
        title: opt.title,
        payload: opt.payload
    }));
    await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        recipient: { id: senderId },
        message: { text: text, quick_replies: quick_replies }
    });
}

app.listen(process.env.PORT || 3000);