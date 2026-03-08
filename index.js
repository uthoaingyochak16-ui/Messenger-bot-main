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

    if (messaging) {
        const senderId = messaging.sender.id;

        // পোস্টব্যাক, কুইক রিপ্লাই এবং টেক্সট মেসেজ হ্যান্ডল করার সঠিক লজিক
        const text = messaging.postback ? messaging.postback.payload : 
                     (messaging.message && messaging.message.quick_reply ? messaging.message.quick_reply.payload : 
                     (messaging.message && messaging.message.text ? messaging.message.text.trim() : ""));

        if (text.includes(',')) {
            const response = await axios.post(GOOGLE_APPS_SCRIPT_URL, { senderId, text, type: 'data' });
            await sendMessage(senderId, response.data.reply);
        }
        else if (['hi', 'hello', 'হাই', 'হ্যালো'].includes(text.toLowerCase())) {
            // সুন্দর বাটন টেম্পলেট
            await sendButtonTemplate(senderId,"আপনাকে কীভাবে সহায়তা করতে পারি?\n\n" +"আমাদের প্রতিনিধির সাথে সরাসরি যোগাযোগ করতে চাইলে নিচের 1 নম্বর বাটনে ক্লিক করুন।\n" +"আমাদের সম্পর্কে বিস্তারিত জানতে চাইলে নিচের 2 নম্বর বাটনে ক্লিক করুন।", [
                { type: "postback", title: "❶", payload: "1" },
                { type: "postback", title: "❷", payload: "2" }
            ]);
        }
        else if (text === '1' || text === '2') {
            const response = await axios.post(GOOGLE_APPS_SCRIPT_URL, { senderId, text, type: 'choice' });
            await sendMessage(senderId, response.data.reply);
        }
    }
    res.sendStatus(200);
});

// সাধারণ টেক্সট মেসেজ পাঠানোর ফাংশন
async function sendMessage(senderId, text) {
    await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        recipient: { id: senderId },
        message: { text: text }
    });
}

// প্রফেশনাল বাটন টেম্পলেট পাঠানোর ফাংশন
async function sendButtonTemplate(senderId, text, buttons) {
    await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        recipient: { id: senderId },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: text,
                    buttons: buttons
                }
            }
        }
    });
}

app.listen(process.env.PORT || 3000);