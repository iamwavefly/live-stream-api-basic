const dateUtil = require('date-fns');
const functions = require("../utility/function.js")

module.exports = mongoose => {
  let schema = mongoose.Schema({
        message_id: { 
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
        from: { 
            type: String,
            required: true
        },
        to: { 
            type: String,
            required: true
        },
        text: {
            type: String,
            required: true
        }
    }, { timestamps: true });

    const Message = mongoose.model("message", schema);
    return Message;
};