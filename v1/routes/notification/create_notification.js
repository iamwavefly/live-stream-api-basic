const dateUtil = require('date-fns');
const path = require("path");
const functions = require("../../utility/function.js")

const db = require("../../models");
const USER = db.user;
const NOTIFICATION = db.notification;

// CACHE
const NodeCache = require('node-cache');
const cache_expiry = process.env.CACHE_EXPIRY_SECONDS;
const cache = new NodeCache({ stdTTL: cache_expiry, checkperiod: cache_expiry * 0.2, useClones: false });

module.exports = function (app) {
    let endpoint_category = path.basename(path.dirname(__filename));

    app.post(`/${endpoint_category}/create_notification`, async (request, response) => {

        /* 
        token
        workspace_id
        name
        message
        */

        if (request.body.token && request.body.workspace_id && request.body.name && request.body.message) {

            let payload = {
                is_verified: false,
                is_blocked: false,
                is_registered: false,
                token: request.query.token
            }

            let userExists = await USER.find({ token: request.body.token})
            
            if (!functions.empty(userExists)) {
                
                try {

                    userExists = Array.isArray(userExists)? userExists[0] : userExists;

                    await NOTIFICATION.create({
                        token: request.body.token,
                        workspace_id: request.body.workspace_id,
                        name: request.body.name,
                        message: request.body.message
                    })

                    let notificationExists = await NOTIFICATION.find({ token: request.body.token, workspace_id: request.body.workspace_id})

                    payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                    payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                    payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                    payload["notifications"] = notificationExists,
                    response.status(200).json({ "status": 200, "message": "Notifications message has been saved successfully.", "data": payload });
                
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