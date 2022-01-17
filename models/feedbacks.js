const dateUtil = require('date-fns');
const functions = require("../utility/function.js")

module.exports = mongoose => {
  let schema = mongoose.Schema({
        feedback_id: { 
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
        name: { 
            type: String,
            required: true
        },
        email: {
            type: String,
            default: ""
        },
        type: {
            type: String,
            enum : ['video','audio', 'text'],
            default: "video"
        },
        url: {
            type: String,
            default: ""
        },
        text: {
            type: String,
            default: ""
        }
    }, { timestamps: true });

    const Feedback = mongoose.model("feedback", schema);
    return Feedback;
};