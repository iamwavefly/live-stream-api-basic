const dateUtil = require('date-fns');
const functions = require("../utility/function.js")

module.exports = mongoose => {
  let schema = mongoose.Schema({
        workspace_id: { 
            type: String,
            required: true
        },
        token: { 
            type: String,
            required: true
        },
        apps: [
            {
                folder_id: {
                    type: String,
                    default: ""
                },
                name: {
                    type: String,
                    default: "",
                    enum: ["google_drive", "dropbox", "one_drive", "box"]
                },
                access_token: {
                    type: String,
                    default: ""
                },
                refresh_token: {
                    type: String,
                    default: ""
                },
                api_key: {
                    type: String,
                    default: ""
                },
                is_connected: {
                    type: Boolean,
                    default: false
                }
            }
        ]
    }, { timestamps: true });

    const Integration = mongoose.model("integration", schema);
    return Integration;
};