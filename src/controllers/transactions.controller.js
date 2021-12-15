const mongoose = require('mongoose');
const { transactionsSchema } = require('../models/transactionsModel');


const getAllTransactions = async (req, res, next) => {
    //Get user currently logged in
    const user = req.user;

    //Go to the users transactions collection
    const user_transaction_model = mongoose.model('usersTransactions', transactionsSchema, 'transaction ' + user._id);

    try {
        //Get all the transactions
        const allTransactions = await user_transaction_model.find();

        //Return all transactions
        return res.status(200).send(allTransactions);
    }
    catch (e) {
        next(e);
    }
}

const getAllTransactionsOfACard = async (req, res, next) => {
    //Get user currently logged in
    const user = req.user;

    //Go to the users transactions collection
    const user_transaction_model = mongoose.model('usersTransactions', transactionsSchema, 'transaction ' + user._id);

    const card_doc_id = req.params.cardId;

    try {
        //Get all transactions of a particular card.
        const allTransactions = await user_transaction_model.find({ card: card_doc_id });

        return res.status(200).send(allTransactions);

    }
    catch (e) {
        next(e);
    }
}

module.exports.getAllTransactions = getAllTransactions;
module.exports.getAllTransactionsOfACard = getAllTransactionsOfACard;