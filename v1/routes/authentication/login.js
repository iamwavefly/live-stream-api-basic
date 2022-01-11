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

    app.post(`${endpoint_category}/login`, async function (request, response) {

        /* 
        email
        password */

        if (request.body.email && request.body.password) {

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

            // Validate password
            if (!functions.validatePassword(request.body.password)) {
                response.status(400).json({ "status": 400, "message": "Password must be at least 8 characters long with alphanumerics, check and try again.", "data": payload });
                return true;
            }

            let encrypted_password = functions.encrypt(request.body.password)
            let userExists = await USER.find({ email: request.body.email, password: encrypted_password})
            
            if (!functions.empty(userExists)) {

                userExists = Array.isArray(userExists)? userExists[0] : userExists;
                
                // Check if user is blocked
                if (userExists.is_blocked) {
                    payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                    payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                    payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                    response.status(400).json({ "status": 400, "message": "This user account has been blocked, contact support for assistance.", "data": payload });
                    return true;
                }

                //Check if user is not verified
                if (!userExists.is_verified) {
                    payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                    payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                    payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                    response.status(400).json({ "status": 400, "message": "This user account has not been verified, check your email or phone to verify.", "data": payload });
                    return true;
                }

                try {

                    if (userExists.password === encrypted_password) {

                        payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                        payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                        payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                        payload["name"] = userExists.name

                        let new_token = functions.uniqueId(30, "alphanumeric");

                        USER.update({"email": request.body.email },
                        {$set: { 
                            "token": new_token,
                            token_expiry: dateUtil.addMinutes(new Date(), process.env.TOKEN_EXPIRY_MINUTES).toISOString()
                        }});

                        payload["token"] = new_token

                        response.status(200).json({ "status": 200, "message": "User login details has been verified successfully.", "data": payload });
                        

                    } else {
                        payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                        payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                        payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                        response.status(400).json({ "status": 400, "message": "Incorrect user access key (pin or password) credential entered, check and retry.", "data": payload });
                    }
                } catch (e) {
                    response.status(400).json({ "status": 400, "message": e.message, "data": payload });
                }

            } else {
                response.status(400).json({ "status": 400, "message": "Incorrect user login credential entered, check and retry.", "data": payload });
            }

        } else {
            response.status(400).json({ "status": 400, "message": "Incomplete or missing requests parameter(s)", "data": null });
        }
    })

}