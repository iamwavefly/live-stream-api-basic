const path = require("path");
const dateUtil = require('date-fns');
const db = require("../../models");
const functions = require("../../utility/function.js")
const USER = db.user;
const INTEGRATION = db.integration;

module.exports = function (app) {
    let endpoint_category = path.basename(path.dirname(__filename));

    app.post(`/${endpoint_category}/disconnect`, async (request, response, next) => {
        try {

            // token
            // workspace_id
            // app_name

            let payload = {
                is_verified: false,
                is_blocked: false,
                is_registered: false
            }

            let userExists = await USER.find({ token: request.body.token})
            let integrationExists = await INTEGRATION.find({ token: request.body.token, workspace_id: request.body.workspace_id})
            
            if (!functions.empty(userExists)) {

                userExists = Array.isArray(userExists)? userExists[0] : userExists;
                integrationExists = Array.isArray(integrationExists)? integrationExists[0] : integrationExists;

                // Check if token has expired
                const difference = Math.abs(dateUtil.differenceInMinutes(new Date(userExists.token_expiry), new Date()))
                if (difference > process.env.TOKEN_EXPIRY_MINUTES) {
                    payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                    payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                    payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                    throw new Error("This user authentication token has expired, login again retry.")
                }

                await INTEGRATION.updateOne(
                    { "token": request.body.token, "workspace_id": request.body.workspace_id },
                    { "$pull": { 
                            "apps": {
                                "name": request.body.app_name
                            } 
                        } 
                    }
                )

                integrationExists = await INTEGRATION.find({ token: request.body.token, workspace_id: request.body.workspace_id})
                integrationExists = Array.isArray(integrationExists)? integrationExists[0] : integrationExists;

                payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                payload["integrations"] = integrationExists;

                response.status(200).json({ "status": 200, "message": "Dropbox diconnection response.", "data": payload })


            } else {
                response.status(400).json({ "status": 400, "message": "User account access authentication credentials failed, check and retry.", "data": payload });
            }

        } catch (error) {
            response.status(400).json({ "status": 400, "message": error.message, "data": null });
        }
    })

}