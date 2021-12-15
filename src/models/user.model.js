const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

//UPDATED
const UserSchema = mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    salt: {
        type: String,
        required: true
    },
    profileImage: {
        type: String
    },
    transaction_stats: [
        {
            vendor: String,
            total: Number,
            number_of_transactions: Number
        }
    ]

});

/*
UserSchema.pre('save', async function (next) {
    // Check if it's a new account or password was modified
    if (!this.isModified('password')) {
        return next();
    }

    // Salt then hash the password
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(this.password, salt);
        this.password = hash;
        next();
    } catch (e) {
        return next(e);
    }


});

// Function to find out if the password hashes match
UserSchema.methods.isPasswordMatch = function (password, hashed, callback) {
    // Comparing the request's hased password with the saved hashed password
    bcrypt.compare(password, hashed, (err, success) => {
        if (err) {
            return callback(err);
        }

        callback(null, success);

    });
};*/

// Override JSON function for customization
UserSchema.methods.toJSON = function () {
    const userObject = this.toObject();
    delete userObject.salt;
    delete userObject.password;
    delete userObject.transaction_stats;
    return userObject;
};

const User = mongoose.model('users', UserSchema);

module.exports = User;