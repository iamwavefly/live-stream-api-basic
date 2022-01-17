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

// ACCOUNT
const get_user = require('./routes/account/get_user')
const edit_user = require('./routes/account/edit_user')
const change_password = require('./routes/account/change_password')
const upload_photo = require('./routes/account/upload_photo')
get_user(app)
edit_user(app)
change_password(app)
upload_photo(app)

// WORKSPACE
const create_workspace = require('./routes/workspace/create_workspace')
const edit_workspace = require('./routes/workspace/edit_workspace')
const delete_workspace = require('./routes/workspace/delete_workspace')
const get_workspaces = require('./routes/workspace/get_workspaces')
const save_brand_styles = require('./routes/workspace/save_brand_styles')
const upload_brand_logo = require('./routes/workspace/upload_brand_logo')
create_workspace(app)
edit_workspace(app)
delete_workspace(app)
get_workspaces(app)
save_brand_styles(app)
upload_brand_logo(app)

// VIDEO
const upload_video = require('./routes/video/upload_video')
const edit_video = require('./routes/video/edit_video')
const delete_video = require('./routes/video/delete_video')
const get_videos = require('./routes/video/get_videos')
upload_video(app)
edit_video(app)
delete_video(app)
get_videos(app)

// ANALYTIC
const set_visits = require('./routes/analytic/set_visits')
const set_plays = require('./routes/analytic/set_plays')
const set_clicks = require('./routes/analytic/set_clicks')
const set_likes = require('./routes/analytic/set_likes')
const all_stats = require('./routes/analytic/all_stats')
set_visits(app)
set_plays(app)
set_clicks(app)
set_likes(app)
all_stats(app)

// TEAM
const create_team = require('./routes/team/create_team')
const edit_team = require('./routes/team/edit_team')
const delete_team = require('./routes/team/delete_team')
const get_teams = require('./routes/team/get_teams')
create_team(app)
edit_team(app)
delete_team(app)
get_teams(app)

// NOTIFICATION
const get_notifications = require('./routes/notification/get_notifications')
const create_notification = require('./routes/notification/create_notification')
get_notifications(app)
create_notification(app)

// MESSAGE
const get_messages = require('./routes/message/get_messages')
const create_message = require('./routes/message/create_message')
get_messages(app)
create_message(app)

// FEEDBACK
const get_feedbacks = require('./routes/feedback/get_feedbacks')
const create_feedback = require('./routes/feedback/create_feedback')
const delete_feedback = require('./routes/feedback/delete_feedback')
get_feedbacks(app)
create_feedback(app)
delete_feedback(app)


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