const { CardSchema } = require('../models/card.model');
const encryptedKeysModel = require('../models/encryptedKeys');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { update } = require('../models/user.model');
const crypt = require('../crypto/crypt');


//Get all cards, returns the encrypted mapping key
const getAllCards = async (req, res, next) => {

    //Get the user logged in
    const user = req.user;

    //User's cards collection
    const usersCardModel = mongoose.model('usersCards', CardSchema, 'user ' + user._id);

    try {
        //Get all the cards
        const allCards = await usersCardModel.find();

        //Return the results array
        return res.status(200).send({
            card: allCards
        })
    } catch (e) {
        next(e);
    }

};

//Get all cards, returns decrypted mapping key for all the cards
const getAllCardsDecrypted = async (req, res, next) => {

    //Get current logged in user
    const user = req.user;

    //User's cards collection
    const usersCardModel = mongoose.model('usersCards', CardSchema, 'user ' + user._id);
    try {

        //Get all cards of the user
        const allCards = await usersCardModel.find();

        //Format the output to have id, nickname, image, decrypted mapping key, hashmap, last4digits
        for(var i = 0 ; i < allCards.length; i++) {

            //Userid+cardid string to get the record from encryptedKeys collection
            const user_card = user._id + allCards[i]._id;

            //Get the salt which was used to hash userid+cardid
            const salt = allCards[i].salt;

            //Hashing user_card
            const hash = await bcrypt.hash(user_card, salt);

            //find in encryptedkeys collection, where card value is equal to the hash generated.
            const encryptedKeyDetails = await encryptedKeysModel.findOne({ card: hash });


            //Get the encrypted key
            const encryptedkey = encryptedKeyDetails.encryptedKey;

            //Decrypt the encrypted key
            const key = crypt.decryptWithPrivate(encryptedkey);

            //Decrypt the mapping key
            var mappingKey = crypt.decryptMappingKey(key,
                encryptedKeyDetails.mappingKeyTag, encryptedKeyDetails.mappingKeyIV, allCards[i].mappingKey);

            mappingKey = mappingKey.toString('utf-8');

            allCards[i].mappingKey = mappingKey;
        }

        //Return results array
        return res.status(200).send({
            card: allCards
        })
    } catch (e) {
        next(e);
    }
}

//Add card
const addCard = async (req, res, next) => {
    //Get the user
    const user = req.user;

    //Go to the users cards collection
    const usersCardModel = mongoose.model('usersCards', CardSchema, 'user ' + user._id);

    //Generate key to encrypt the mapping key
    const genKey = crypt.generateKey();

    //Encrypt the mapping key
    const { encryptedMappingKey, iv, tag } = crypt.encryptMappingKey(genKey, req.body.mappingKey);

    //Encrypt key with public key
    const encryptedKey = crypt.encryptWithPublic(genKey);

    //Generate salt to hash userid+cardid.
    const salt = await bcrypt.genSalt(12);

    //Store card details
    const card = new usersCardModel({
        nickName: req.body.nickName,
        image: req.body.image,
        mappingKey: encryptedMappingKey,
        hashMap_1: req.body.hashMap_1,
        last4Digits: req.body.last4Digits,
        salt: salt
    })

    try {
        //Save the card details
        const saved = await card.save();

        //Userid+cardid string to store the record in encryptedKeys collection
        const user_card = user._id + saved._id;

        //Hashing user_card, to be stored in encryptedKeys collection
        const hash = await bcrypt.hash(user_card, salt);

        //Store encryptedKey details in a separate collection
        const encryptedKeyDetails = new encryptedKeysModel({
            card: hash,
            mappingKeyIV: iv,
            mappingKeyTag: tag,
            encryptedKey: encryptedKey
        });

        //Saving encryptedKeyDetails
        const savedEncryptedKeyDetails = await encryptedKeyDetails.save();

        return res.send(saved);
    } catch (e) {
        next(e);
    }
};

//to get a single card with decrypted mapping key
const getCard = async (req, res, next) => {
    const user = req.user;
    const usersCardModel = mongoose.model('usersCards', CardSchema, 'user ' + user._id);

    //get card id from params
    const cardId = req.params.id;

    try {
        //get the card requested from mongoDB
        const cardReceived = await usersCardModel.findById(cardId);

        //Userid+cardid string to get the record from encryptedKeys collection
        const user_card = user._id + cardReceived._id;

        //Get the salt which was used to hash userid+cardid
        const salt = cardReceived.salt;

        //Hashing user_card
        const hash = await bcrypt.hash(user_card, salt);

        //find in encryptedkeys collection, where card value is equal to the hash generated.
        const encryptedKeyDetails = await encryptedKeysModel.findOne({ card: hash });

        //Getting the encrypted key used to encrypt the mapping key
        const encryptedkey = encryptedKeyDetails.encryptedKey;

        //Decrypting the key with private key
        const key = crypt.decryptWithPrivate(encryptedkey);

        //Decrypting the mapping key
        const decryptedMappingKey = crypt.decryptMappingKey(key, encryptedKeyDetails.mappingKeyTag,
            encryptedKeyDetails.mappingKeyIV, cardReceived.mappingKey);

        cardReceived.mappingKey = decryptedMappingKey.toString('utf-8');

        return res.status(200).send(cardReceived);

    }
    catch (e) {
        next(e);
    }
}

const updateCard = async (req, res, next) => {
    const user = req.user;
    const usersCardModel = mongoose.model('usersCards', CardSchema, 'user ' + user._id);
    const cardId = req.params.id;

    try {
        //Get card to update
        const cardToUpdate = await usersCardModel.findById(cardId);

        //Userid+cardid string to get the record from encryptedKeys collection
        const user_card = user._id + cardToUpdate._id;

        //Get the salt which was used to hash userid+cardid
        const salt = cardToUpdate.salt;

        //Hashing user_card
        const hash = await bcrypt.hash(user_card, salt);

        //find in encryptedkeys collection, where card value is equal to the hash generated.
        const encryptedKeyDetails = await encryptedKeysModel.findOne({ card: hash });

        //Get the encrypted key from encryptedKeys collection
        const encryptedKey = encryptedKeyDetails.encryptedKey;

        //Decrypt the key
        const key = crypt.decryptWithPrivate(encryptedKey);

        var updatedMappingKeyIV;
        var updatedMappingKeyTag;
        //If the mapping key has been updated
        if (req.body.hasOwnProperty('mappingKey')) {
            //Encrypt the new mapping key
            const { encryptedMappingKey, iv, tag } = crypt.encryptMappingKey(key, req.body.mappingKey);

            //Change req.body parameters
            req.body.mappingKey = encryptedMappingKey;
            updatedMappingKeyIV = iv;
            updatedMappingKeyTag = tag
        }
        //Update card
        const updatedCard = await usersCardModel.findByIdAndUpdate(cardId, req.body, { new: true, useFindAndModify: false });

        console.log("Updated mapping key iv: " + updatedMappingKeyIV);

        if (updatedMappingKeyIV != null && updatedMappingKeyTag != null) {
            console.log("IN");
            //Update encryptedKeys collection
            const updatedKeysCollection = await encryptedKeysModel.findByIdAndUpdate(encryptedKeyDetails._id, { mappingKeyIV: updatedMappingKeyIV, mappingKeyTag: updatedMappingKeyTag }, { new: true, useFindAndModify: false })
        }
        return res.json(updatedCard)
    }
    catch (e) {
        next(e);
    }
}

const deleteCard = async (req, res, next) => {
    const user = req.user;
    const usersCardModel = mongoose.model('usersCards', CardSchema, 'user ' + user._id);
    const cardId = req.params.id;

    try {
        //delete the card
        const deletedCard = await usersCardModel.findByIdAndRemove(cardId, { useFindAndModify: false });

        //Userid+cardid string to get the record from encryptedKeys collection
        const user_card = user._id + cardId;

        //Get the salt which was used to hash userid+cardid
        const salt = deletedCard.salt;

        //Hashing user_card
        const hash = await bcrypt.hash(user_card, salt);

        //find in encryptedkeys collection, where card value is equal to the hash generated.
        const encryptedKeyDetails = await encryptedKeysModel.findOne({ card: hash });

        //delete the corresponding document in encryptedKeys collection
        await encryptedKeysModel.findByIdAndRemove(encryptedKeyDetails._id, { useFindAndModify: false });

        return res.send({
            success: true
        })
    }
    catch (e) {
        next(e);
    }
}

module.exports.getAllCards = getAllCards;
module.exports.getAllCardsDecrypted = getAllCardsDecrypted;
module.exports.addCard = addCard;
module.exports.getCard = getCard;
module.exports.updateCard = updateCard;
module.exports.deleteCard = deleteCard;