const dateUtil = require('date-fns');
const functions = require("../utility/function.js")

module.exports = mongoose => {
  let schema = mongoose.Schema({
        template_id: { 
            type: String,
            default: functions.uniqueId(10, "alphanumeric"),
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
    }, { timestamps: true });

    const Template = mongoose.model("template", schema);
    return Template;
};