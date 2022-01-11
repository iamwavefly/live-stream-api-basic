const mongoose = require('mongoose')
mongoose.Promise = global.Promise;

let username = 'sparkler';
let password = 'sparkler12345';
let database = 'sparkle';
let collection = 'records'
const db_url = `mongodb+srv://${username}:${password}@${database}.pvnng.mongodb.net/${collection}?retryWrites=true&w=majority`

const db = {};
db.mongoose = mongoose;
db.url = db_url;

db.user = require("../models/users")(mongoose);

module.exports = db;