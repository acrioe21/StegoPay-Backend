const tls = require('tls');
const path = require('path');
const fs = require('fs');

// Function that initates the TLS connection to the Bank server
function tlsConnect(image, mappingKey) {

    // Defining the host and port to connect to
    const PORT = 9999;
    const HOST = 'localhost';

    // Reading and setting the server's private key and certificate
    var options = {
        key: process.env.PRIVATE_KEY.replace(/\\n/gm, '\n'),
        cert: fs.readFileSync(path.join(__dirname, '..', '..', 'cert', 'cert.pem')),
        rejectUnauthorized: false
    };

    // Establishing a TLS connection
    var client = tls.connect(PORT, HOST, options, function () {

        // Sending the stego-card (image) and mapping key to the bank as a JSON object
        client.write(JSON.stringify({
            image64: image,
            mappingK: mappingKey
        }));

    });


    client.setEncoding('utf-8');


    // On receiving data from the server
    client.on("data", (data) => {
        console.log(`Received from Bank server: ${data}`);
        client.end();
    });

    // On connection termination
    client.on('close', () => {
        console.log("Connection closed.");
    });

    // On catching an error
    client.on('error', (error) => {
        console.log(error);
        client.destroy();
    });


}
module.exports.tlsConnect = tlsConnect;