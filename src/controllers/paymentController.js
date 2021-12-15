const mongoose = require('mongoose');
const sessionModel = require('../models/sessionModel');
const wooCommerceApi = require("@woocommerce/woocommerce-rest-api").default;
const { CardSchema } = require('../models/card.model');
const User = require('../models/user.model');
const encryptedKeysModel = require('../models/encryptedKeys');
const bcrypt = require('bcryptjs');
const crypt = require('../crypto/crypt');
const { decoding } = require('../steganography/decoding');
const { mapping } = require('../steganography/mapping');
const { transactionsSchema } = require('../models/transactionsModel');
const { tlsConnect } = require('../tls/tls');

//UPDATED
const postOrderDetails = async (req, res, next) => {
    //Create a new session, with the items, orderID, total_amount, success 
    const session = new sessionModel({
        items: req.body.items,
        orderID: req.body.orderID,
        total_amount: req.body.total_amount,
        redirect_url: req.body.redirect_url,
        site_url: req.body.site_url,
        store_name: req.body.store_name,
        currency: req.body.currency
    });
    //save the session to the db, and pass the document id of the session to PHP plugin
    try {
        const savedSession = await session.save();
        return res.status(200).send(savedSession._id);
    }
    catch (e) {
        return res.status(400).send('ERROR');
    }
}

//Get order details route
const getOrderDetails = async (req, res, next) => {
    //If no cookie is sent with the request, return with an error
    if (!req.header('Cookie')) {
        return res.status(404).send({
            error: "The session has expired"
        });
    }

    //Get sessionID from the cookie
    const sessionID = req.header('Cookie').split("=");

    //find the document in the sessions collection, and send the order details
    try {
        const details = await sessionModel.find({ _id: sessionID[1] });
        res.status(200).send(
            {
                order: details
            }
        );
    }
    catch (e) {
        res.status(404).send({
            success: false
        });
    }
}

//Pay route
const pay = async (req, res, next) => {

    //If no cookie is sent with the request, return with an error
    if (!(req.header('Cookie'))) {
        console.log("COOKIE ERROR");

        return res.status(402).send({
            error: "Session Expired"
        });
    }

    //Get sessionID from the cookie
    const sessionID = req.header('Cookie').split("=");

    //to store session details
    var details;
    try {
        //find the document in the sessions collection, to get the total_amount.
        details = await sessionModel.findById(sessionID[1]);
    }
    catch (error) {
        console.log("SESSION ERROR");
        next(error);
    }

    //Get the user logged in
    const user = req.user;

    //User's cards collection
    const usersCardModel = mongoose.model('usersCards', CardSchema, 'user ' + user._id);

    //Get cardId of the card user wants to pay with.
    const cardId = req.body.cardId;

    //to store card from DB
    var cardReceived;
    try {
        //Getting the card from DB
        cardReceived = await usersCardModel.findById(cardId);
    }
    catch (error) {
        console.log("CARD ERROR");
        next(error);
    }

    //Userid+cardid string to get the record from encryptedKeys collection
    const user_card = user._id + cardReceived._id;

    //Get the salt which was used to hash userid+cardid
    const salt = cardReceived.salt;

    //Hashing user_card
    const hash = await bcrypt.hash(user_card, salt);

    //find in encryptedkeys collection, where card value is equal to the hash generated.
    const encryptedKeyDetails = await encryptedKeysModel.findOne({ card: hash });

    //Getting the encrypted key used to encrypt the mapping key
    const encryptedKey = encryptedKeyDetails.encryptedKey;

    //Decrypting the key with private key
    const key = crypt.decryptWithPrivate(encryptedKey);

    //Decrypting the mapping key
    const decryptedMappingKey = crypt.decryptMappingKey(key, encryptedKeyDetails.mappingKeyTag,
        encryptedKeyDetails.mappingKeyIV, cardReceived.mappingKey);

    //Setting the mapping key to the decrypted mapping key.
    cardReceived.mappingKey = decryptedMappingKey.toString('utf-8');

    //decoding to get the card details.
    var decoded;
    var image_data;

    decoding(cardReceived.mappingKey, cardReceived.image, (decodedASCII, imageData) => {
        decoded = decodedASCII;
        image_data = imageData;
    });

    console.log("DECODED: " + decoded);

    //Generating timestamp
    const timeStamp = new Date().toString();
    console.log("Time stamp : " + timeStamp);

    //Appending amount and timestamp to CCDetails
    decoded += " " + details.total_amount + " " + timeStamp;

    //encrypting the CCDetails + amount + timestamp with banks public key
    const final_binary_text_to_map = crypt.encrypt_with_banks_public(decoded);

    console.log("Encrypted binary: " + final_binary_text_to_map);

    //Mapping the encrypted details
    const final_mapping_key = mapping(final_binary_text_to_map, image_data, cardReceived.hashMap_1);

    //Mapping Key
    console.log(final_mapping_key);

    // Establish a TLS connection with the bank and send the mapping key and the selected stego-card (image)
    tlsConnect(cardReceived.image, final_mapping_key);

    //If payment is successful

    //Post payment successful to store
    postSuccessToStore(details.orderID, details.site_url);

    //Go to the users transactions collection
    const user_transaction_model = mongoose.model('usersTransactions', transactionsSchema, 'transaction ' + user._id);

    //transaction to be stored for record.
    const transaction = new user_transaction_model({
        vendor: details.store_name,
        amount: details.total_amount,
        date: timeStamp,
        card: cardId,
        currency: details.currency,
        items: details.items
    });

    //Saving the transaction details.
    const saved = await transaction.save();

    //Check if user has a transaction with this store
    const index = user.transaction_stats.findIndex(obj => obj.vendor == details.store_name);

    //If user has a transaction with this store before
    if (index != -1) {
        user.transaction_stats[index].total += details.total_amount;
        user.transaction_stats[index].number_of_transactions++;
    }
    else {
        user.transaction_stats.push({
            vendor: details.store_name,
            total: details.total_amount,
            number_of_transactions: 1
        });
    }
    //Updating users stats
    const updated = await User.findByIdAndUpdate(user._id, { transaction_stats: user.transaction_stats }, { new: true, useFindAndModify: false });

    //Deleting the session, since the transaction details have been saved.
    const deleted = await sessionModel.findOneAndRemove({ _id: details._id }, { useFindAndModify: false });


    console.log("Payment Successful");
    return res.status(200).send({
        message: "Payment successful",
        redirect_url: details.redirect_url,
    }
    );
}

const getUserStats = (req, res, next) => {

    const user = req.user;
    const vendor = req.params.vendor;


    //Get index in the array of the vendor requested
    const index = user.transaction_stats.findIndex(obj => obj.vendor == vendor);
    console.log("INDEX: " + index);

    if (index != -1) {
        console.log("HERE");
        return res.status(200).send(user.transaction_stats[index]);
    }
    else {
        next(e);
    }
}

function postSuccessToStore(orderID, siteUrl) {

    const api = new wooCommerceApi(
        {
            url: siteUrl,
            consumerKey: process.env.CONSUMER_KEY,
            consumerSecret: process.env.CONSUMER_SECRET,
            version: "wc/v3"
        }
    )
    const data = {
        status: "completed"
    };
    api.put(`orders/${orderID}`, data)
        .then((response) => console.log(response.data.status))
        .catch((error) => console.log(error.response.data));
}


module.exports.postOrderDetails = postOrderDetails;
module.exports.getOrderDetails = getOrderDetails;
module.exports.pay = pay;
module.exports.getUserStats = getUserStats;