const path = require("path");
const dateUtil = require('date-fns');
const db = require("../../../models");
const functions = require("../../../utility/function.js")
var request_url = require('request');
var BoxSDK = require('box-node-sdk');
const https = require('https');

const USER = db.user;
const INTEGRATION = db.integration;

BoxSDK = new BoxSDK({
  clientID: process.env.BOX_CLIENT_ID,
  clientSecret: process.env.BOX_CLIENT_SECRET
});

module.exports = function (app) {
    let endpoint_directory = path.basename(path.dirname(__dirname));
    let endpoint_category = path.basename(path.dirname(__filename));

    app.post(`/${endpoint_directory}/${endpoint_category}/upload`, async (request, response, next) => {
        try {  

            // token
            // workspace_id
            // file_url

            if (request.body.token && request.body.workspace_id && request.body.file_url) {

                const REDIRECT_URL = `${process.env.REDIRECT_URL}/integrations/box/callback`;

                let payload = {
                    is_verified: false,
                    is_blocked: false,
                    is_registered: false,
                    token: request.body.token
                }

                let userExists = await USER.find({ token: request.body.token})
                let integrationExists = await INTEGRATION.find({ token: request.body.token, workspace_id: request.body.workspace_id, "apps.name": "box"})
                
                if (!functions.empty(userExists)) {

                    userExists = Array.isArray(userExists)? userExists[0] : userExists;
                    integrationExists = Array.isArray(integrationExists)? integrationExists[0] : integrationExists;
                    integrationExists = integrationExists.apps.filter((app) => {return app.name.toLowerCase() === "box" })[0]

                    // Check if token has expired
                    const difference = Math.abs(dateUtil.differenceInMinutes(new Date(userExists.token_expiry), new Date()))
                    if (difference > process.env.TOKEN_EXPIRY_MINUTES) {
                        payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                        payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                        payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                        throw new Error("This user authentication token has expired, login again retry.")
                    }

                    var url = 'https://api.box.com/oauth2/token';
                    var body = {
                        "grant_type": "refresh_token",
                        "refresh_token": integrationExists.refresh_token,
                        "client_id": process.env.BOX_CLIENT_ID,
                        "client_secret": process.env.BOX_CLIENT_SECRET
                    };

                    request_url.post(url, {form: body, json: true}, async (err, res, body) => {

                        await INTEGRATION.updateOne(
                            { "token": request.body.token, "workspace_id": request.body.workspace_id, "apps.name": "box"},
                            { "$set": { 
                                    "apps.$.access_token": body.access_token,
                                    "apps.$.refresh_token": body.refresh_token,
                                    "apps.$.is_connected": true
                                } 
                            }
                        )

                        // UPLOAD

                        var BoxClient = BoxSDK.getBasicClient(body.access_token);
                        https.get(request.body.file_url, async (stream) => {
                            try {

                                BoxClient.files.uploadFile(integrationExists.folder_id, `${functions.uniqueId(30, "alphanumeric")}.mp4`, stream).then((file) => {
                                    response.status(200).json({ "status": 200, "message": "Box upload response.", "data": file})
                                }).catch((err) => {
                                    throw new Error(err)
                                })

                            } catch (error) {
                                throw new Error(error)
                            }
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