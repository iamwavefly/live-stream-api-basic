const path = require("path");
const dateUtil = require('date-fns');
var request_url = require('request');
const db = require("../../../models");
const functions = require("../../../utility/function.js")
const USER = db.user;
const INTEGRATION = db.integration;

module.exports = function (app) {
    let endpoint_directory = path.basename(path.dirname(__dirname));
    let endpoint_category = path.basename(path.dirname(__filename));

    app.get(`/${endpoint_directory}/${endpoint_category}/refresh`, async (request, response, next) => {
        try {

            // token
            // workspace_id

            let token = request.query.token;
            let workspace_id = request.query.workspace_id;

            let payload = {
                is_verified: false,
                is_blocked: false,
                is_registered: false
            }

            let userExists = await USER.find({ token: token})
            let integrationExists = await INTEGRATION.find({ token: token, workspace_id: workspace_id, "apps.$.name": "dropbox"})
            
            if (!functions.empty(userExists)) {

                userExists = Array.isArray(userExists)? userExists[0] : userExists;
                integrationExists = Array.isArray(integrationExists)? integrationExists[0] : integrationExists;

                integrationExists = integrationExists.apps.filter((app) => {return app.name.toLowerCase() === "dropbox" })[0]
                
                // Check if token has expired
                const difference = Math.abs(dateUtil.differenceInMinutes(new Date(userExists.token_expiry), new Date()))
                if (difference > process.env.TOKEN_EXPIRY_MINUTES) {
                    payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                    payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                    payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                    throw new Error("This user authentication token has expired, login again retry.")
                }

                var url = 'https://api.dropbox.com/1/oauth2/token';
                var body = {
                    "code": request.query.code,
                    "grant_type": "refresh_token",
                    "refresh_token": integrationExists.refresh_token,
                    "client_id": process.env.DBX_APP_KEY,
                    "client_secret": process.env.DBX_APP_SECRET
                };

                request_url.post(url, {form: body, json: true}, async (err, res, body) => {
                    
                    await INTEGRATION.updateOne(
                        { "token": token, "workspace_id": workspace_id, "apps.$.name": "dropbox"},
                        { "$set": { 
                                "apps.$.access_token": body.access_token,
                                "apps.$.refresh_token": body.refresh_token,
                                "apps.$.is_connected": true
                            } 
                        }
                    )

                    payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                    payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                    payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                    payload["integrations"] = integrationExists;

                    response.status(200).json({ "status": 200, "message": "Dropbox callback response.", "data": payload })

                });

            } else {
                response.status(400).json({ "status": 400, "message": "User account access authentication credentials failed, check and retry.", "data": payload });
            }

        } catch (error) {
            response.status(400).json({ "status": 400, "message": error.message, "data": null });
        }
    })

}