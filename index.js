const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();

app.use(bodyParser.json());

// Environment Variables
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// Webhook Verification
app.get('/webhook', (req, res) => {
    if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
        res.status(200).send(req.query['hub.challenge']);
    } else {
        res.sendStatus(403);
    }
});

app.get('/', (req, res) => {
    res.send('Bot is running safely!');
});

// Handling Incoming Messages
app.post('/webhook', async (req, res) => {
    const entry = req.body.entry ? req.body.entry[0] : null;
    const messaging = entry ? entry.messaging[0] : null;

    if (messaging) {
        const senderId = messaging.sender.id;
        
        // Extracting Text from different sources (Text, Quick Reply, or Postback)
        let text = "";
        if (messaging.postback) {
            text = messaging.postback.payload;
        } else if (messaging.message && messaging.message.quick_reply) {
            text = messaging.message.quick_reply.payload;
        } else if (messaging.message && messaging.message.text) {
            text = messaging.message.text.trim();
        }

        // 1. If text contains a comma (assuming data submission)
        if (text.includes(',')) {
            try {
                const response = await axios.post(GOOGLE_APPS_SCRIPT_URL, { senderId, text, type: 'data' });
                await sendMessage(senderId, response.data.reply);
            } catch (error) {
                console.error("Apps Script Error:", error.message);
            }
        }
        // 2. Welcome Message (Hi/Hello)
        else if (['hi', 'hello', 'হাই', 'হ্যালো'].includes(text.toLowerCase())) {
            const welcomeText = 
                "আপনাকে কীভাবে সাহায্য করতে পারি?\n\n"+
                "❶ আমাদের প্রতিনিধির সাথে সরাসরি যোগাযোগ করতে চাইলে নিচের ➊ নম্বর বাটনে ক্লিক করুন।\n\n" +
                "❷ আমাদের সম্পর্কে বিস্তারিত জানতে চাইলে নিচের ➋ নম্বর বাটনে ক্লিক করুন।";

            const quickReplies = [
                { content_type: "text", title: "❶ [Click Here]", payload: "1" },
                { content_type: "text", title: "❷ [Click Here]", payload: "2" }
            ];

            await sendQuickReplies(senderId, welcomeText, quickReplies);
        }
        // 3. Option selection (1 or 2)
        else if (text === '1' || text === '2') {
            try {
                const response = await axios.post(GOOGLE_APPS_SCRIPT_URL, { senderId, text, type: 'choice' });
                await sendMessage(senderId, response.data.reply);
            } catch (error) {
                console.error("Apps Script Error:", error.message);
            }
        }
    }
    res.sendStatus(200);
});

// Function to send Text with Quick Replies
async function sendQuickReplies(senderId, welcomeText, quickReplies) {
    try {
        await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            recipient: { id: senderId },
            message: {
                text: welcomeText, 
                quick_replies: quickReplies
            }
        });
        console.log("Quick Replies sent successfully");
    } catch (error) {
        console.error("Quick Reply Error Detail:", error.response ? error.response.data : error.message);
    }
}

// Basic Send Message Function
async function sendMessage(senderId, text) {
    if (!text) return; // Don't send if text is empty
    try {
        await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            recipient: { id: senderId },
            message: { text: text }
        });
        console.log("Message sent successfully");
    } catch (error) {
        console.error("Send Message Error Detail:", error.response ? error.response.data : error.message);
    }
}

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT,'0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
