const dateUtil = require('date-fns');
const path = require("path");
const functions = require("../../utility/function.js")

const db = require("../../models");
const USER = db.user;
const FEEDBACK = db.feedback;

// CACHE
const NodeCache = require('node-cache');
const cache_expiry = process.env.CACHE_EXPIRY_SECONDS;
const cache = new NodeCache({ stdTTL: cache_expiry, checkperiod: cache_expiry * 0.2, useClones: false });

module.exports = function (app) {
    let endpoint_category = path.basename(path.dirname(__filename));

    app.delete(`/${endpoint_category}/delete_feedback`, async (request, response) => {

        /* 
        token
        feedback_id
        */

        if (request.body.token && request.body.feedback_id) {

            let payload = {
                is_verified: false,
                is_blocked: false,
                is_registered: false,
                token: request.query.token
            }

            let userExists = await USER.find({ token: request.body.token})
            let feedbackExists = await FEEDBACK.find({ token: request.body.token, feedback_id: request.body.feedback_id})

            if (!functions.empty(feedbackExists)) {
                try {

                    feedbackExists = Array.isArray(feedbackExists)? feedbackExists[0] : feedbackExists;
                    userExists = Array.isArray(userExists)? userExists[0] : userExists;

                    FEEDBACK.findOneAndDelete({token: request.body.token, feedback_id: request.body.feedback_id });

                    payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                    payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                    payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                    payload["feedbacks"] = feedbackExists,
                    response.status(200).json({ "status": 200, "message": "User feedback has been deleted successfully.", "data": payload });
                
                } catch (e) {
                    response.status(400).json({ "status": 400, "message": e.message, "data": payload });
                }

            } else {
                response.status(400).json({ "status": 400, "message": "Workspace feedback credentials doesn't match any record, check and retry.", "data": payload });
            }

        } else {
            response.status(400).json({ "status": 400, "message": "Incomplete or missing requests parameter(s)", "data": null });
        }

    })

}