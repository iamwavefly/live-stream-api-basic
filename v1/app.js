const dotenv = require('dotenv');
dotenv.config();

const express = require('express')
const bodyParser = require('body-parser')
const http = require('http');
const helmet = require('helmet')
const cors = require('cors');
var cluster = require('cluster');

// DATABASE
const db = require("./models/index.js");
db.mongoose.connect(db.url, {useNewUrlParser: true, useUnifiedTopology: true}).then(() => {
    console.log("Connected to the database!");
}).catch(err => {
    console.log("Cannot connect to the database!", err);
    process.exit();
});

// APP ENVIRONMENT
process.env.NODE_ENV = process.env.MODE;
if (process.env.MODE.toLowerCase() == "production") {
    process.on('uncaughtException', function (err) {
        console.error((new Date).toUTCString() + ' uncaughtException error:', err.message)
        process.exit(0)
    })
}

const app = express()
app.use(helmet())
app.use(cors());

app.use(function(req, res, next) {
  res.setHeader(
    'Content-Security-Policy',
    "default-src *; font-src 'self' http://* 'unsafe-inline'; img-src 'self' https: http: data: blob:; script-src 'self' * 'unsafe-inline' 'unsafe-eval'; style-src 'self' * 'unsafe-inline'; frame-src 'self' https: http: data: blob:; media-src 'self' https: http: data: blob:"
  );
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(bodyParser.json({
    limit: '700000000000gb'
}));

app.use(bodyParser.urlencoded({
    limit: '700000000000gb',
    parameterLimit: 100000000000,
    extended: true
}));

//STATIC
app.use('/media', express.static('media'))

// ROUTES

// AUTHENTICATION
const login = require('./routes/authentication/login')
const signup = require('./routes/authentication/signup')
const resend_code = require('./routes/authentication/resend_code')
const reset_password = require('./routes/authentication/reset_password')
const verify_code = require('./routes/authentication/verify_code')

login(app)
signup(app)
resend_code(app)
reset_password(app)
verify_code(app)

app.get("/", (req, res) => {
  res.status(200).json({ "status": 200, "message": "Welcome to sparkle api.", "data": null })
});

// 404
app.get('*', function (req, res) {
    res.status(400).json({ "status": 400, "message": "You seem to be lost in this wide and bountiful internet.", "data": null })
});

// SERVER
const setupServer = () => {

    const CONCURRENCY = process.env.WEB_CONCURRENCY || 1;
    var PORT = process.env.PORT

    if (cluster.isMaster) {
        for (var i = 0; i < CONCURRENCY; i++) {
            cluster.fork();
        }

        cluster.on('exit', function () {
            if (process.env.MODE == 'production') {
                cluster.fork();
            }
        });

    } else {
        http.createServer(app).listen(PORT, () => console.log(`Listening on ${PORT}`));
    }

};

setupServer();