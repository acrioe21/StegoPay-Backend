const mongoose = require('mongoose');

const SessionSchema = mongoose.Schema(
    {
        items: [
            {
                product_id: Number,
                name: String,
                quantity: Number,
                product_price: Number
            }
        ],
        orderID: Number,
        total_amount: Number,
        redirect_url: String,
        site_url: String,
        store_name: String,
        currency: String,
        expire_at: {type: Date, default: Date.now, expires: 900}
    }
);

const session = mongoose.model('sessions', SessionSchema);
module.exports = session;