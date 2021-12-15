//FOR HTTPS
const https = require('https');
const path = require('path');
const fs = require('fs');

//Configuring the dotenv file.
require('dotenv').config();

const app = require('./src/app');

const PORT = process.env.PORT || 5000;

//gm is global multiline.
const sslServer = https.createServer({
    key: process.env.PRIVATE_KEY.replace(/\\n/gm, '\n'),
    cert: fs.readFileSync(path.join(__dirname,'cert','cert.pem'))
},
app);

sslServer.listen(PORT, () => {
    console.log(`HTTPS Server is ready on port ${PORT}`);
})