const dateUtil = require('date-fns');
const path = require("path");
const functions = require("../../utility/function.js")

const db = require("../../models");
const USER = db.user;

// CACHE
const NodeCache = require('node-cache');
const cache_expiry = process.env.CACHE_EXPIRY_SECONDS;
const cache = new NodeCache({ stdTTL: cache_expiry, checkperiod: cache_expiry * 0.2, useClones: false });

module.exports = function (app) {
    let endpoint_category = '/v1/'+path.basename(path.dirname(__filename));

    app.post(`${endpoint_category}/resend_code`, async function (request, response) {

        /* 
        email */

        if (request.body.email && request.body.verification_code) {

            let payload = {
                is_verified: false,
                is_blocked: false,
                is_registered: false
            }

            // Validate email address
            if (!functions.validateEmail(request.body.email)) {
                response.status(400).json({ "status": 400, "message": "Email address provided is invalid, check and try again.", "data": payload });
                return true;
            }

            try {
                
                // Check is Email exists
                let userExists = await USER.find({ email: request.body.email})

                if (functions.empty(userExists)) {

                    payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                    response.status(400).json({ "status": 400, "message": "No user account matches the entered credentials.", "data": payload });
                
                } else {

                    if (!functions.stringToBoolean(userExists.is_verified)) {

                        // Send email
                        let subject = `Verify your ${functions.ucwords(process.env.APP_NAME)} account`;
                        let message = `${userExists.verification_code} is your ${functions.ucwords(process.env.APP_NAME)} account verification code.`;
                        functions.sendEmail(subject, request.body.email, message, "html", function () { })
                    
                    }
                    response.status(200).json({ "status": 200, "message": "Email address verification code has been resent to your mail.", "data": payload });
                
                }

            } catch (e) {
                response.status(400).json({ "status": 400, "message": e.message, "data": payload });
            }

        } else {
            response.status(400).json({ "status": 400, "message": "Incomplete or missing requests parameter(s)", "data": null });
        }
    })

}