const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;

// ১. ফেসবুক ওয়েব-হুক ভেরিফিকেশন
app.get('/webhook', (req, res) => {
    if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
        res.status(200).send(req.query['hub.challenge']);
    } else {
        res.sendStatus(403);
    }
});

// ২. ফেসবুক মেসেজ হ্যান্ডলিং
app.post('/webhook', async (req, res) => {
    const data = req.body;
    if (data.object === 'page') {
        data.entry.forEach(async (entry) => {
            const event = entry.messaging[0];
            const senderId = event.sender.id;

            if (event.message && event.message.text) {
                const text = event.message.text.trim();

                // হাই/হ্যালো লজিক
                if (['hi', 'hello', 'হাই', 'হ্যালো'].includes(text.toLowerCase())) {
                    await sendMessage(senderId, "আমি আপনাকে কিভাবে সাহায্য করতে পারি? \n[ 1 ] Apni ki amader kono protinidir shatha gogagok korte chan \n[ 2 ] othoba amader shomporke jante chan?");
                }
                // ডাটা এন্ট্রি লজিক
                else if (text.includes(',')) {
                    const response = await axios.post(GOOGLE_APPS_SCRIPT_URL, { senderId, text });
                    await sendMessage(senderId, response.data.reply);
                }
                // অপশন ১ ও ২ লজিক
                else if (text === '1') {
                    await sendMessage(senderId, "অনুগ্রহ করে আপনার তথ্য এভাবে দিন: Full_Name, Phone_Number, Description");
                } else if (text === '2') {
                    await sendMessage(senderId, "https://quantummethod.org.bd/bn \nThanks for interested about us.");
                }
            }
        });
        res.status(200).send('EVENT_RECEIVED');
    }
});

async function sendMessage(senderId, text) {
    await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        recipient: { id: senderId },
        message: { text }
    });
}
app.listen(process.env.PORT || 3000);