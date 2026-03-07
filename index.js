const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const SHEET_URL = process.env.SHEET_URL;
const VERIFY_TOKEN =process.env.PAGE_ACCESS_TOKEN;
// =======================
// WEBHOOK VERIFY (optional)
// =======================

app.get('/', (req, res) => {
    res.send("Bot Running Successfully");
});

// =======================
// MAIN WEBHOOK
// =======================

app.post('/webhook', async (req, res) => {

    try {

        if (!req.body.entry) return res.sendStatus(200);

        const event = req.body.entry[0].messaging[0];
        const senderId = event.sender.id;

        if (!event.message || !event.message.text) {
            return res.sendStatus(200);
        }

        const text = event.message.text.trim();

        // =========================
        // GREETING
        // =========================

        if (["hi", "hello"].includes(text.toLowerCase())) {
            return sendMenu(senderId);
        }

        // =========================
        // MENU CLICK HANDLER
        // =========================

        if (text === "Contact Representative") {
            return sendText(senderId,
                "Doya kore ei format e likhun:\n\n016XXXXXXXX, apnar problem"
            );
        }

        if (text === "About Us") {
            await sendText(senderId,
                "Amader somporke jante visit korun:\nhttps://quantummethod.org.bd/bn"
            );

            return sendText(senderId,
                "Thanks for interested about us."
            );
        }

        // =========================
        // PHONE + DESCRIPTION DETECT
        // =========================

        const phoneMatch = text.match(/01\d{9}/);

        if (phoneMatch) {

            const phone = phoneMatch[0];

            // Remove only phone number
            const description = text.replace(phone, "").trim();

            const fullName = await getUserName(senderId);

            // Send to Google Sheet
            const response = await axios.post(SHEET_URL, {
                si: senderId,
                date: new Date().toISOString().split("T")[0],
                name: fullName,
                phone: phone,
                problem: description
            });

            // =========================
            // DUPLICATE CHECK
            // =========================

            if (response.data.status === "exists") {

                return sendText(senderId,
                    `Hello ${fullName}, apnar ${phone} number e age data entry newa hoyeche.\nProblem: ${response.data.problem}`
                );
            }

            // Mask phone number
            const maskedPhone = phone.substring(0,3) + "******";

            return sendText(senderId,
                `Thank you ${fullName}, For filling this.\n\nSummary:\nYour Phone Number: ${maskedPhone}\nProblem: ${description}\n\nApnar shofol vabe save hoyeche. Khub shigroi amader akjon protinidhi apnar shathe jogajog korbe.`
            );
        }

        res.sendStatus(200);

    } catch (error) {
        console.log(error);
        res.sendStatus(200);
    }

});

// =======================
// QUICK REPLY MENU
// =======================

async function sendMenu(id) {

    await axios.post(
        `https://graph.facebook.com/v15.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        {
            recipient: { id: id },
            message: {
                text: "Ami apnake kivabe shahajjo korte pari?",
                quick_replies: [
                    {
                        content_type: "text",
                        title: "Contact Representative",
                        payload: "CONTACT"
                    },
                    {
                        content_type: "text",
                        title: "About Us",
                        payload: "ABOUT"
                    }
                ]
            }
        }
    );
}

// =======================

async function sendText(id, text) {

    await axios.post(
        `https://graph.facebook.com/v15.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        {
            recipient: { id: id },
            message: { text: text }
        }
    );
}

// =======================

async function getUserName(senderId) {

    const url = `https://graph.facebook.com/${senderId}?fields=first_name,last_name&access_token=${PAGE_ACCESS_TOKEN}`;

    const res = await axios.get(url);

    return `${res.data.first_name} ${res.data.last_name}`;
}

// =======================

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on", PORT));