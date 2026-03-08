const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
const VERIFY_TOKEN=process.env.VERIFY_TOKEN

app.post('/webhook', async (req, res) => {
    // ফেসবুক থেকে ইভেন্ট ডাটা নেওয়া
    const entry = req.body.entry[0];
    const messaging = entry.messaging[0];
    const senderId = messaging.sender.id;
    const text = messaging.message.text ? messaging.message.text.trim() : "";

    // লজিক ১: ডাটা এক্সট্রাকশন (যদি কমা থাকে)
    if (text.includes(',')) {
        const response = await axios.post(GOOGLE_APPS_SCRIPT_URL, { senderId, text, type: 'data' });
        await sendMessage(senderId, response.data.reply);
    }
    // লজিক ২: হাই/হ্যালো মেনু
    else if (['hi', 'hello', 'হাই', 'হ্যালো'].includes(text.toLowerCase())) {
        await sendMessage(senderId, "আমি আপনাকে কিভাবে সাহায্য করতে পারি? \n[ 1 ] প্রতিনিধির সাথে যোগাযোগ \n[ 2 ] আমাদের ওয়েবসাইট ভিজিট করুন");
    }
    // লজিক ৩: মেনু অপশন সিলেকশন
    else if (text === '1' || text === '2') {
        const response = await axios.post(GOOGLE_APPS_SCRIPT_URL, { senderId, text, type: 'choice' });
        await sendMessage(senderId, response.data.reply);
    }
    
    res.sendStatus(200);
});

async function sendMessage(senderId, text) {
    await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        recipient: { id: senderId },
        message: { text: text }
    });
}

app.listen(process.env.PORT || 3000);