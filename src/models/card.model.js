const mongoose = require('mongoose');


const CardSchema = mongoose.Schema({
    nickName: { type: String },
    image: { type: String },
    mappingKey: { type: String },
    hashMap_1: {
        0: { type: String },
        1: { type: String },
        2: { type: String },
        3: { type: String },
        4: { type: String },
        5: { type: String },
        6: { type: String },
        7: { type: String }
    },
    last4Digits: { type: String },
    salt: {type: String}
    //mappingKeyIV: { type: String },
    //mappingKeyTag: {type: String},
    //encryptedKey : {type: String}
});

// Override JSON function for customization
CardSchema.methods.toJSON = function () {
    const cardObject = this.toObject();
    delete cardObject.salt;
    //delete cardObject.mappingKeyIV;
    //delete cardObject.mappingKeyTag;
    //delete cardObject.encryptedKey;
    return cardObject;
};



module.exports.CardSchema = CardSchema;