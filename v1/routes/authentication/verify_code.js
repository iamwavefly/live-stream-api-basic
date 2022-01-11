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

    app.post(`${endpoint_category}/verify_code`, async function (request, response) {

        /* 
        email
        verification_code */

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
                let userExists = await USER.find({ email: request.body.email, verification_code: request.body.verification_code})

                if (functions.empty(userExists)) {

                    response.status(400).json({ "status": 400, "message": "Verification code didn't match this user credentials.", "data": payload });
                
                } else {

                    userExists = Array.isArray(userExists)? userExists[0] : userExists;

                    USER.update({"email": request.body.email },
                    {$set: { 
                        verification_code: "",
                        is_verified: true
                    }});

                    // Send email
                    let subject = `Your are to ${functions.ucwords(process.env.APP_NAME)}`;
                    let message = `We are very excited to have you onboard ${functions.ucwords(process.env.APP_NAME)} superstars.`;
                    functions.sendEmail(subject, request.body.email, message, "html", function () { })
                    
                    response.status(200).json({ "status": 200, "message": "Your email address has been verified successfully.", "data": payload });
                
                }

            } catch (e) {
                response.status(400).json({ "status": 400, "message": e.message, "data": payload });
            }

        } else {
            response.status(400).json({ "status": 400, "message": "Incomplete or missing requests parameter(s)", "data": null });
        }
    })

}