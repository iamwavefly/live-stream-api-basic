const dateUtil = require('date-fns');
const functions = require("../utility/function.js")

module.exports = mongoose => {
  let schema = mongoose.Schema({
        notification_id: { 
            type: String,
            default: functions.uniqueId(10, "alphanumeric"),
            required: true
        },
        workspace_id: { 
            type: String,
            required: true
        },
        token: { 
            type: String,
            required: true
        },
        photo: { 
            type: String,
            default: ""
        },
        name: { 
            type: String,
            required: true
        },
        message: {
            type: String,
            required: true
        }
    }, { timestamps: true });

    const Notification = mongoose.model("notification", schema);
    return Notification;
};