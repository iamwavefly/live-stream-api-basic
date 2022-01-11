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

    app.post(`${endpoint_category}/reset_password`, async function (request, response) {

        /* 
        email
        verification_code */

        if (request.body.email) {

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
                    response.status(400).json({ "status": 400, "message": "Verification code didn't match this user credentials.", "data": payload });
                
                } else {

                    let new_password = functions.uniqueId(8, "number")

                    USER.update({"email": request.body.email },
                    {$set: { 
                        password: functions.encrypt(new_password),
                    }});

                    // Send email
                    let subject = `${functions.ucwords(process.env.APP_NAME)} password reset`;
                    let message = `<p>Hello ${functions.ucwords(userExists.name.split(" ")[0])}! we have temporarily reset your password to <strong>${new_password}</strong></p>`;
                    functions.sendEmail(subject, userExists.email, message, "html", function () { })
                    
                    response.status(200).json({ "status": 200, "message": "Check your email address for a temporarily generated password.", "data": payload });
                
                }

            } catch (e) {
                response.status(400).json({ "status": 400, "message": e.message, "data": payload });
            }

        } else {
            response.status(400).json({ "status": 400, "message": "Incomplete or missing requests parameter(s)", "data": null });
        }
    })

}