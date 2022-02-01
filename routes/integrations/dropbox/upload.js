const path = require("path");
const dateUtil = require('date-fns');
const db = require("../../../models");
const functions = require("../../../utility/function.js")
var request_url = require('request');
const dropboxV2Api = require('dropbox-v2-api');
const https = require('https');

const USER = db.user;
const INTEGRATION = db.integration;

module.exports = function (app) {
    let endpoint_directory = path.basename(path.dirname(__dirname));
    let endpoint_category = path.basename(path.dirname(__filename));

    app.post(`/${endpoint_directory}/${endpoint_category}/upload`, async (request, response, next) => {
        try {  

            // token
            // workspace_id
            // file_url

            if (request.query.token && request.query.workspace_id && request.query.file_url) {

                let payload = {
                    is_verified: false,
                    is_blocked: false,
                    is_registered: false,
                    token: request.query.token
                }

                let userExists = await USER.find({ token: request.query.token})
                let integrationExists = await INTEGRATION.find({ token: request.query.token, workspace_id: request.query.workspace_id, "apps.$.name": "dropbox"})
                
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

                    const dropbox = dropboxV2Api.authenticate({
                        token: integrationExists.access_token
                    });

                    https.get(file_url, (stream) => {
                        dropbox({
                            resource: 'files/upload',
                            parameters: {
                                path: `/SendBetter/${functions.uniqueId(30, "alphanumeric")}.mp4`
                            },
                            readStream: stream
                        }, (err, result, report) => {
                            if(err){ throw new Error(err) }
                            response.status(200).json({ "status": 200, "message": "Dropbox upload response.", "data": result})
                        });
                    });

                } else {
                    response.status(400).json({ "status": 400, "message": "User account access authentication credentials failed, check and retry.", "data": payload });
                }

            } else {
                response.status(400).json({ "status": 400, "message": "Incomplete or missing requests parameter(s)", "data": null });
            }

        } catch (error) {
            response.status(400).json({ "status": 400, "message": error.message, "data": null });
        }
    })

}