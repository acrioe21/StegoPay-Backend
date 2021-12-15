const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const hashModel = require('../models/hashesModel');

const signUp = async (req, res, next) => {
    //Destructuring
    const { firstName, lastName, email, password } = req.body;

    //Generate Salt 1
    const salt1 = await bcrypt.genSalt(12);

    //Generate Salt 2
    const salt2 = await bcrypt.genSalt(12);

    //Hash1
    const hash1 = await bcrypt.hash(password, salt1);

    //Hash2
    const hash2 = await bcrypt.hash(password, salt2);

    //Create a new user, stores hash2 and salt1
    const newUser = new User({
        firstName: firstName,
        lastName: lastName,
        email: email,
        password: hash2.substring(29),
        salt: salt1,
        profileImage: ''
    });

    //Create a new hash entry, stores hash1 and salt2
    const hashEntry = new hashModel({
        hash: hash1.substring(29),
        salt: salt2
    })

    //If user exists, return an error message
    const userExists = await User.findOne({ email: email });
    if (userExists) {
        var error = new Error(`Email address ${newUser.email} is already taken.`);
        next(error);
        return;
    }

    //Save the new user and hash entry
    try {
        const user = await newUser.save();
        const hash = await hashEntry.save();
        return res.status(200).send({ user });
    } catch (e) {
        next(e);
    }
};


const logIn = async (req, res, next) => {

    // Destructuring
    // Get the email and password from the request
    const { email, password } = req.body;

    const response = await logInHelper(email, password);

    // If email does not exist, display error
    if (response == 402) {
        const err = new Error(`The email ${email} was not found on our system.`);
        err.status = 402;
        next(err);
        return;
    }

    // If credentials match, create a JWT token
    if (response.code == 200) {
        const secret = process.env.JWT_SECRET;
        const expiration = process.env.JWT_EXPIRATION;
        //Generating token
        const token = jwt.sign({ _id: response.user._id }, secret, { expiresIn: expiration });
        return res.status(200).send({ token });
    }
    if (response == 401) {
        res.status(401).send({
            error: 'Invalid email/password combination.'
        });
    }
    if (response == 500) {
        const error = new Error('Invalid email/password combination.');
        next(error);
    }
};

const logInAndroid = async (req, res, next) => {

     // Destructuring
    // Get the email and password from the request
    const { email, password } = req.body;

    //Call log in helper.
    const response = await logInHelper(email, password);

    // If email does not exist, display error
    if (response == 402) {
        const err = new Error(`The email ${email} was not found on our system.`);
        err.status = 402;
        next(err);
        return;
    }

    // If credentials match, create a JWT token
    if (response.code == 200) {
        const secret = process.env.JWT_SECRET;
        //Generating token
        const token = jwt.sign({ _id: response.user._id }, secret);
        return res.status(200).send({ token });
    }
    if (response == 401) {
        res.status(401).send({
            error: 'Invalid email/password combination.'
        });
    }
    if (response == 500) {
        const error = new Error('Invalid email/password combination.');
        next(error);
    }
};


//Get Profile
const profile = (req, res, next) => {
    const { user } = req;
    res.status(200).send({ user });
}

//Update Profile
const updateProfile = async (req, res, next) => {
    const { user } = req;

    try {
        //If password is sent, delete req.body.password, as password can 
        //only be changed using /changePassword route
        if (req.body.hasOwnProperty('password') || req.body.hasOwnProperty('_id') || req.body.hasOwnProperty('salt')) {
            delete req.body._id;
            delete req.body.password;
            delete req.body.salt;
        }
        const updatedUser = await User.findByIdAndUpdate(user._id, req.body, { new: true, useFindAndModify: false });
        return res.status(200).send(updatedUser);
    }
    catch (e) {
        next(e);
    }
}

//log in helper
const logInHelper = async (email, password) => {

    try {
        // Check if the email exists
        const user = await User.findOne({ email });

        // If email does not exist, send response code 402
        if (!user) {
            return 402;
        }

        // If email exists, check if the correct password was entered

        //Get salt1 and hash2 from user entry
        const salt1 = user.salt;
        const hash2 = user.password;

        //Obtain hash to search in hashes entry, by hashing the entered password with salt1
        const hashToGetFromHashesEntry = await bcrypt.hash(password, salt1);

        //Get the hash entry
        const hashEntry = await hashModel.findOne({ hash: hashToGetFromHashesEntry.substring(29) });

        //Get salt 2 from hash entry
        const salt2 = hashEntry.salt;

        //Hash password entered with salt2
        const toMatch = await bcrypt.hash(password, salt2);

        // If credentials match, send response code 200
        if ((hash2 === toMatch.substring(29))) {
            return (
                {
                    code: 200,
                    user: user
                }
            );
        }
        //else send response code 401
        else {
            return 401;
        }
    }
    catch (e) {
        return 500;
    }
}


module.exports.signUp = signUp;
module.exports.logIn = logIn;
module.exports.logInAndroid = logInAndroid;
module.exports.profile = profile;
module.exports.updateProfile = updateProfile;