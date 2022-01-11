const dateUtil = require('date-fns');
const functions = require("../utility/function.js")

module.exports = mongoose => {
  let schema = mongoose.Schema({
        token: { 
            type: String,
            default: functions.uniqueId(30, "alphanumeric"),
            required: true
        },
        name: { 
            type: String,
            required: true
        },
        gender: {
            type: String,
            default: "unspecified"
        },
        email: {
            type: String,
            required: true
        },
        password: {
            type: String,
            required: true
        },
        country: {
            type: String,
            default: "us"
        },
        currency: {
            type: String,
            default: "usd"
        },
        verification_code: {
            type: Number
        },
        is_verified: {
            type: Boolean,
            default: false
        },
        is_registered: {
            type: Boolean,
            default: false
        },
        is_blocked: {
            type: Boolean,
            default: false
        },
        token_expiry: { 
            type: String,
            default: dateUtil.addMinutes(new Date(), process.env.TOKEN_EXPIRY_MINUTES).toISOString()
        }
    }, { timestamps: true });

    const User = mongoose.model("user", schema);
    return User;
};