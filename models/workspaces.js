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
        name: { 
            type: String,
            required: true
        },
        category: {
            type: String,
            default: ""
        },
        brand_styles: {
            logo: {
                type: String,
                default: ""
            },
            title_color: {
                type: String,
                default: ""
            },
            description_color: {
                type: String,
                default: ""
            },
            text_color: {
                type: String,
                default: ""
            },
            button_color: {
                type: String,
                default: ""
            },
            rounded_button: {
                type: Boolean,
                default: false
            },
            background_color: {
                type: String,
                default: ""
            }
        }
    }, { timestamps: true });

    const Workspace = mongoose.model("workspace", schema);
    return Workspace;
};