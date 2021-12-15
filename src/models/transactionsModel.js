const mongoose = require('mongoose');
//UPDATED
const transactionsSchema = mongoose.Schema({
    vendor: String,
    amount: Number,
    date: Date,
    card: String,
    currency: String,
    items: [
        {
            product_id: Number,
            name: String,
            quantity: Number,
            product_price: Number
        }
    ]
});

module.exports.transactionsSchema = transactionsSchema;