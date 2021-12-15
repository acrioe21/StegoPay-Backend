const express = require('express');
const router = express.Router();
const passport = require('passport');

const { signUp, logIn, profile, logInAndroid, updateProfile } = require('../controllers/users.controller');
const { addCard, getAllCards, getCard, updateCard, deleteCard, getAllCardsDecrypted } = require('../controllers/cards.controller');
const { getAllTransactions, getAllTransactionsOfACard } = require('../controllers/transactions.controller');
const { postOrderDetails, getOrderDetails, pay, getUserStats } = require('../controllers/paymentController');

// Sign up and login
router.post('/signUp', signUp);
router.post('/logIn', logIn);
router.post('/logInAndroid', logInAndroid);

router.post('/postOrderDetails', postOrderDetails);
router.get('/getOrderDetails', getOrderDetails);

// Check authentication for all requests
router.all('*', (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user) => {
        console.log("AUTHENTICATING USER");
        // If there is an error or the user object does not exist, display error
        if (err || !user) {
            const error = new Error('You are not authorized to access this section.');
            console.log("ERROR FROM HERE");
            error.status = 401;
            throw error; // or next(error)
        }

        // User authenticated
        req.user = user;
        return next();
    })(req, res, next);
});


// ------- Protected Routes ------- //

router.get('/profile', profile);
router.patch('/updateProfile', updateProfile);

router.get('/getAllCards', getAllCards);
router.get('/getAllCardsDecrypted', getAllCardsDecrypted);
router.post('/addCard', addCard);
router.get('/getCard/:id', getCard);
router.patch('/updateCard/:id', updateCard);
router.delete('/deleteCard/:id', deleteCard);

router.get('/getAllTransactions', getAllTransactions);
router.get('/getAllTransactionsOfACard/:cardId', getAllTransactionsOfACard);

router.post('/pay', pay);

router.get('/getUserStats/:vendor', getUserStats);


module.exports = router;