const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

//Generate Key, returns a keyobject
function generateKey() {
    //Generate 128 bit key for AES encryption/decryption
    const keyGenerated = crypto.generateKeySync('aes', { 'length': 128 });

    //Return keyobject
    return keyGenerated;
}

//Encrypts Key with the Public Key of Node, returns encryptedKey in base64
function encryptWithPublic(keyToEncrypt) {

    //Read public key
    //const publicKey = fs.readFileSync(path.join(path.dirname(require.main.filename), 'cert', 'publicKey.pem'), 'utf-8');

    const publicKey = process.env.PUBLIC_KEY.replace(/\\n/gm, '\n');

    //Create a base64 buffer from keyObject
    var buffer = Buffer.from(keyToEncrypt.export().toString('base64'));

    //Encrypt buffer with the public key
    var encryptedAESKey = crypto.publicEncrypt(publicKey, buffer);

    //Return encryptedAESKey in base64
    return encryptedAESKey.toString('base64');
}

//to encrypt the mapping key, args: keyToEncrypt(keyObject), mappingKey(string), returns encryptedMappingKey in base64
function encryptMappingKey(key, mappingKey) {
    //Generate IV of 128 bits
    const iv = crypto.randomBytes(16);

    //Create cipher 
    var cipher = crypto.createCipheriv('aes-128-gcm', key, iv);

    //Encrypt mapping key
    var encrytedMappingKey = Buffer.concat([cipher.update(mappingKey), cipher.final()]);

    //Get authentication tag
    var tag = cipher.getAuthTag();

    //Return encrypted mapping key, IV, authentication tag in base 64
    return ({
        encryptedMappingKey: encrytedMappingKey.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64')
    }
    );
}

//Decrypt encryptedKey
function decryptWithPrivate(encryptedKey) {
    //Convert encryptedKey to buffer
    const encryptedAESKey = Buffer.from(encryptedKey, 'base64');

    //Read private key
    //var privateKey = fs.readFileSync(path.join(path.dirname(require.main.filename), 'cert', 'key.pem'));

    var privateKey = process.env.PRIVATE_KEY.replace(/\\n/gm, '\n');

    //Decrypt the buffer
    var decryptedKey = crypto.privateDecrypt(privateKey, Buffer.from(encryptedAESKey));

    //Convert decrypted buffer(returns key in Base64) into a key object
    const keyObject = crypto.createSecretKey(decryptedKey.toString('utf-8'), 'base64');

    //Return keyobject
    return keyObject;
}

//Decrypt mapping key
function decryptMappingKey(keyObject, authTag, iv, encryptedMappingKey) {

    //Convert encryptedMappingKey, iv, authtag to buffers
    const encryptedMappingKey_buffer = Buffer.from(encryptedMappingKey, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    const authTagBuffer = Buffer.from(authTag, 'base64');


    //Create decipher object with the algo, iv, and key
    var decipher = crypto.createDecipheriv('aes-128-gcm', keyObject, ivBuffer);

    //Set authentication tag
    decipher.setAuthTag(authTagBuffer);

    //Decrypt the mapping key
    var decryptedMappingKey = Buffer.concat([decipher.update(encryptedMappingKey_buffer), decipher.final()]);

    //Return decrypted mapping key
    return decryptedMappingKey;
}

function encrypt_with_banks_public(CCDetails) {

    //Read banks public key
    const publicKey_bank = fs.readFileSync(path.join(path.dirname(require.main.filename), 'cert', 'publicKey_bank.pem'), 'utf-8');

    const encrypted_buffer = crypto.publicEncrypt(publicKey_bank, CCDetails);

    //converting buffer of bytes to binary.
    var binary = "";
    for (var i = 0; i < encrypted_buffer.length; i++) {
        //get each byte value, convert it to 8 bit binary
        binary += ("000000000" + encrypted_buffer[i].toString(2)).substr(-8);
    }

    //return string of bits.
    return binary;
}


module.exports.generateKey = generateKey;
module.exports.encryptWithPublic = encryptWithPublic;
module.exports.encryptMappingKey = encryptMappingKey;
module.exports.decryptWithPrivate = decryptWithPrivate;
module.exports.decryptMappingKey = decryptMappingKey;
module.exports.encrypt_with_banks_public = encrypt_with_banks_public;

