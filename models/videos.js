const dateUtil = require('date-fns');
const functions = require("../utility/function.js")

module.exports = mongoose => {
  let schema = mongoose.Schema({
        video_id: { 
            type: String,
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
        author: { 
            type: String
        },
        name: { 
            type: String
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
            logo: {
                url: {
                    type: String,
                    default: "https://placeholderlogo.com/img/placeholder-logo-1.png"
                }
            },
            title: {
                text: {
                    type: String,
                    default: "Title Sample"
                },
                color: {
                    type: String,
                    default: "#000000"
                }
            },
            description: {
                text: {
                    type: String,
                    default: "Video description or message here."
                },
                color: {
                    type: String,
                    default: "#000000"
                }
            },
            call_to_action: {
                text: {
                    type: String,
                    default: "I'm a button"
                },
                color: {
                    type: String,
                    default: "#000000"
                },
                font: {
                    type: String,
                    default: "arial"
                },
                url: {
                    type: String,
                    default: "#"
                },
                radius: {
                    type: String,
                    default: "100px"
                },
            }
        },
    }, { timestamps: true });

    const Video = mongoose.model("video", schema);
    return Video;
};