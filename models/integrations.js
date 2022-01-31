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
                name: {
                    type: String,
                    default: ""
                },
                token: {
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