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
        const text = messaging.postback ? messaging.postback.payload : 
                     (messaging.message && messaging.message.quick_reply ? messaging.message.quick_reply.payload : 
                     (messaging.message && messaging.message.text ? messaging.message.text.trim() : ""));

        if (text.includes(',')) {
            const response = await axios.post(GOOGLE_APPS_SCRIPT_URL, { senderId, text, type: 'data' });
            await sendMessage(senderId, response.data.reply);
        }
        else if (['hi', 'hello', 'হাই', 'হ্যালো'].includes(text.toLowerCase())) {
            // কার্ড এবং নিচে Quick Replies সহ ফাংশন কল
            const elements = [{
                title: "আপনাকে কীভাবে সাহায্য করতে পারি?\n\n",
                subtitle:" ",
                image_url: "https://www.developmentaid.org/files/organizationLogos/quantum-foundation-381834.jpg" // এখানে আপনার ছবির লিঙ্ক দিন
            }];

            const welcomeText = 
                    "❶ আমাদের প্রতিনিধির সাথে সরাসরি যোগাযোগ করতে চাইলে নিচের  ➊নম্বর বাটনে ক্লিক করুন।\n\n" +
                    "❷ আমাদের সম্পর্কে বিস্তারিত জানতে চাইলে নিচের  ➋ নম্বর বাটনে ক্লিক করুন।";

            const quickReplies = [
                { content_type: "text", title: "     ❶ 👆 (Click Here) ", payload: "1" },
                { content_type: "text", title: "     ❷ 👆 (Click Here)  ", payload: "2" }
            ];

            await sendGenericWithQuickReplies(senderId, elements,welcomeText, quickReplies);
        }
        else if (text === '1' || text === '2') {
            const response = await axios.post(GOOGLE_APPS_SCRIPT_URL, { senderId, text, type: 'choice' });
            await sendMessage(senderId, response.data.reply);
        }
    }
    res.sendStatus(200);
});

// নতুন ফাংশন: Generic Template + Quick Replies
async function sendGenericWithQuickReplies(senderId, elements,welcomeText, quickReplies) {
    await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        recipient: { id: senderId },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: elements
                }
            },
            // quick_replies: quickReplies
        }
    });

    await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        recipient: { id: senderId },
        message: {
            text: welcomeText, 
            quick_replies: quickReplies
        }
    });
}

async function sendMessage(senderId, text) {
    await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        recipient: { id: senderId },
        message: { text: text }
    });
}

app.listen(process.env.PORT || 3000);