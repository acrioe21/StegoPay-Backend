const mongoose = require('mongoose');

const hashesSchema = mongoose.Schema({
    hash: String,
    salt: String
});

const hashModel = mongoose.model('hashes',hashesSchema);

module.exports = hashModel;