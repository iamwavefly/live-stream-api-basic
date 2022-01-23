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
    let endpoint_category = path.basename(path.dirname(__filename));

    app.put(`/${endpoint_category}/edit_user`, async (request, response) => {

        /* 
        token
        name
        gender
        country
        currency
        job_title
        phone
        */

        if (request.body.token) {

            let payload = {
                is_verified: false,
                is_blocked: false,
                is_registered: false,
                token: request.body.token
            }

            let userExists = await USER.find({ token: request.body.token})

            if (!functions.empty(userExists)) {
                try {

                    userExists = Array.isArray(userExists)? userExists[0] : userExists;

                    // Check if token has expired
                    const difference = Math.abs(dateUtil.differenceInMinutes(new Date(userExists.token_expiry), new Date()))
                    if (difference > process.env.TOKEN_EXPIRY_MINUTES) {
                        payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                        payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                        payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                        throw new Error("This user authentication token has expired, login again retry.")
                    }

                    await USER.updateOne(
                        {token: request.body.token},
                        {
                            name: functions.empty(request.body.name)? userExists.name : request.body.name,
                            gender: functions.empty(request.body.gender)? userExists.gender : request.body.gender,
                            country: functions.empty(request.body.country)? userExists.country : request.body.country,
                            currency: functions.empty(request.body.currency)? userExists.currency : request.body.currency,
                            job_title: functions.empty(request.body.job_title)? userExists.job_title : request.body.job_title,
                            phone: functions.empty(request.body.phone)? userExists.phone : request.body.phone
                        }
                    );

                    payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                    payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                    payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                    payload["profile"] = userExists,
                    response.status(200).json({ "status": 200, "message": "User account details has been edited successfully.", "data": payload });
                
                } catch (e) {
                    response.status(400).json({ "status": 400, "message": e.message, "data": payload });
                }

            } else {
                response.status(400).json({ "status": 400, "message": "User account access authentication credentials failed, check and retry.", "data": payload });
            }

        } else {
            response.status(400).json({ "status": 400, "message": "Incomplete or missing requests parameter(s)", "data": null });
        }

    })

}