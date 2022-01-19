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
db.workspace = require("../models/workspaces")(mongoose);
db.video = require("../models/videos")(mongoose);
db.team = require("../models/teams")(mongoose);
db.notification = require("../models/notifications")(mongoose);
db.message = require("../models/messages")(mongoose);
db.feedback = require("../models/feedbacks")(mongoose);
db.template = require("../models/templates")(mongoose);
module.exports = db;