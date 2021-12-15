const mongoose = require('mongoose');

const encryptedKeysSchema = mongoose.Schema({
    card: {type: String},
    mappingKeyIV: { type: String },
    mappingKeyTag: {type: String},
    encryptedKey : {type: String}
});

const encryptedKeys = mongoose.model('encryptedKeys',encryptedKeysSchema);

module.exports = encryptedKeys;