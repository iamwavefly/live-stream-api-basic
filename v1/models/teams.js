const dateUtil = require('date-fns');
const functions = require("../utility/function.js")

module.exports = mongoose => {
  let schema = mongoose.Schema({
        team_id: { 
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
            required: true,
            default: ""
        },
        password: {
            type: String,
            required: true
        }
    }, { timestamps: true });

    const Team = mongoose.model("team", schema);
    return Team;
};