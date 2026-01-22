const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../mailer.debug.log');

function logToFile(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] ${message}\n`);
}

module.exports = { logToFile };
