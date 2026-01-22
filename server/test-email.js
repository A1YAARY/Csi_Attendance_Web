require('dotenv').config();
const { sendMail } = require('./utils/mailer');

async function test() {
    console.log("--- Starting Test ---");
    // Simulate arguments from bulkUser.controller.js (no html)
    const result = await sendMail(
        process.env.SMTP_USER || process.env.EMAIL_USER, 
        "Test Subject (3 args)", 
        "Test text content"
    );
    console.log("--- Test Result ---");
    console.log(result);
}

test();
