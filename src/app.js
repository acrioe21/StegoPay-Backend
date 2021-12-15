const express = require('express');
const mongoose = require('mongoose');
//On any request you make it generates a log automatically
//logs a message on the console, whenever a request is made
const logger = require('morgan');
const bodyParser = require('body-parser');
const passport = require('passport');
const v1 = require('./routes/v1');

const app = express()

// ------- DB Config ------- //
mongoose.connect(process.env.MONGO_DB_URL, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
});

mongoose.connection.on('connected', () => {
    console.log('Connected to the DB');
});

mongoose.connection.on('error', (err) => {
    console.error(`Failed to connect to the DB: ${err}`);
});


app.disable('etag');
// ------- Middleware------- //
//For logging requests
app.use(logger('dev'));

//Parsing data received
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use(passport.initialize());
app.use(passport.session());
require('./config/passport')(passport);


// ------- Routes ------- //
app.use('/', v1);


// ------- Errors ------- //
app.use((req, res, next) => { // 404 Error handler
    var err = new Error('Not found.');
    err.status = 404;
    next(err);
});

app.use((err, req, res, next) => { // Global error handler
    const status = err.status || 500;
    const error = err.message || 'Error processing your request';

    res.status(status).send({
        error: error
    })

});



module.exports = app;