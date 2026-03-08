const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { google } = require('googleapis');

const app = express();
app.use(bodyParser.json());

// এনভায়রনমেন্ট ভেরিয়েবল (Render-এ সেট করবেন)
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// গুগল শিট অথেন্টিকেশন
const auth = new google.auth.GoogleJWT(
  process.env.CLIENT_EMAIL,
  null,
  process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/spreadsheets']
);
const sheets = google.sheets({ version: 'v4', auth });

// ১. ওয়েব-হুক ভেরিফিকেশন
app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

// ২. মূল লজিক
app.post('/webhook', async (req, res) => {
  const entry = req.body.entry[0];
  const messaging = entry.messaging[0];
  const senderId = messaging.sender.id;
  const text = messaging.message ? messaging.message.text : "";

  // হাই/হ্যালো লজিক
  if (['hi', 'hello', 'হাই', 'হ্যালো'].includes(text.toLowerCase())) {
    await sendReply(senderId, "আমি আপনাকে কিভাবে সাহায্য করতে পারি? [ 1 ] Apni ki amader kono protinidir shatha gogagok korte chan or [ 2 ] othoba amader shomporke jante chan?");
  } 
  // ১ বা ২ সিলেকশন লজিক
  else if (text === '1') {
    await sendReply(senderId, "অনুগ্রহ করে আপনার তথ্য এভাবে দিন: Full_Name, Phone, Description");
  } else if (text === '2') {
    await sendReply(senderId, "আমাদের সম্পর্কে জানতে ভিজিট করুন: https://quantummethod.org.bd/bn");
  }
  // ডাটা এন্ট্রি লজিক
  else if (text.includes(',')) {
    const parts = text.split(',');
    const fullName = parts[0].trim();
    const phone = parts[1].trim();
    const description = parts.slice(2).join(',').trim();

    const rows = (await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Sheet1!A:E' })).data.values || [];
    const exists = rows.find(r => r[3] === phone);

    if (exists) {
      await sendReply(senderId, `Hello ${fullName} ,apnaer e ${phone} number e aga data entry nawa hoyacha. Problem: ${exists[4]}`);
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1!A:E',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[rows.length + 1, new Date().toLocaleString(), fullName, phone, description]] }
      });
      await sendReply(senderId, `Thanks you ${fullName} , For filling this and summary shoe korbe Your phone Number: ${phone}, and problem : ${description}. Apnar shofhol vabe save hoyacha. khub shigroi amader akjon protinidi apner shatha gogagok korbe.`);
    }
  }
  res.sendStatus(200);
});

async function sendReply(senderId, text) {
  await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    recipient: { id: senderId },
    message: { text: text }
  });
}

app.listen(process.env.PORT || 3000);
