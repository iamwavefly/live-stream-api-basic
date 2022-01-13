const dateUtil = require('date-fns');
const functions = require("../utility/function.js")

module.exports = mongoose => {
  let schema = mongoose.Schema({
        video_id: { 
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
        url: {
            type: String,
            default: ""
        },
        visits: {
            type: Number,
            default: 0
        },
        plays: {
            type: Number,
            default: 0
        },
        clicks: {
            type: Number,
            default: 0
        },
        likes: {
            type: Number,
            default: 0
        },
        share_link: {
            type: String,
            default: ""
        },
        email_embed_code: {
            type: String,
            default: ""
        },
        website_embed_code: {
            type: String,
            default: ""
        },
        page: {
            title: {
                type: String,
                default: ""
            },
            description: {
                type: String,
                default: ""
            },
            tags: {
                type: Array,
                default: []
            },
            call_to_action: {
                status: {
                    type: Boolean,
                    default: false
                }, 
                button_text: {
                    type: String,
                    default: "test"
                },
                button_color: {
                    type: String,
                    default: "#000000"
                },
                button_font: {
                    type: String,
                    default: "arial"
                },
                button_url: {
                    type: String,
                    default: ""
                },
            }
        }
    }, { timestamps: true });

    const Video = mongoose.model("video", schema);
    return Video;
};