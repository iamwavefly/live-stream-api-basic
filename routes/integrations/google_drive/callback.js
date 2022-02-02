const path = require("path");
const dateUtil = require('date-fns');
var request_url = require('request');
const db = require("../../../models");
const { google } = require('googleapis');
const functions = require("../../../utility/function.js")
const USER = db.user;
const INTEGRATION = db.integration;

module.exports = function (app) {
    let endpoint_directory = path.basename(path.dirname(__dirname));
    let endpoint_category = path.basename(path.dirname(__filename));

    app.get(`/${endpoint_directory}/${endpoint_category}/callback`, async (request, response, next) => {
        try {

            const REDIRECT_URL = `${process.env.REDIRECT_URL}/integrations/google_drive/callback`;
        
            let payload = {
                is_verified: false,
                is_blocked: false,
                is_registered: false
            }

            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                `${REDIRECT_URL}`
            );

            let authorization_code = request.query.code
            
            let token_response = await oauth2Client.getToken(authorization_code)
            body = token_response.tokens

            oauth2Client.setCredentials({
                access_token: body.access_token,
                refresh_token: body.refresh_token
            });

            const drive = google.drive({
                version: 'v3',
                auth: oauth2Client,
            });

            if(functions.empty(body)){ throw new Error("Access token and refresh token data are missing.") }

            if(!functions.empty(body.access_token) || !functions.empty(body.refresh_token)){
            
                let token = request.query.state.split("_SEPARATOR_")[0]
                let workspace_id = request.query.state.split("_SEPARATOR_")[1]

                let userExists = await USER.find({ token: token})
                let integrationExists = await INTEGRATION.find({ token: token, workspace_id: workspace_id})
                
                if (!functions.empty(userExists)) {

                    try {

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

                        if (functions.empty(integrationExists)) {

                            // CREATE FOLDER
                            try {

                                const drive_report = await drive.files.create({
                                    requestBody: {
                                        name: `SendBetter`,
                                        mimeType: 'application/vnd.google-apps.folder'
                                    },
                                    fields: 'id'
                                });

                                // SAVE CREDENTIALS
                                await INTEGRATION.create({
                                    token: token,
                                    workspace_id: workspace_id,
                                    apps: [
                                        {
                                            folder_id: drive_report.data.id,
                                            name: "google_drive",
                                            access_token: body.access_token,
                                            refresh_token: body.refresh_token,
                                            is_connected: true,
                                        }
                                    ]
                                })

                            } catch (error) {
                                if(error){ throw new Error(error) }
                            }

                        }else{
                            integrationExists = await INTEGRATION.find({ token: token, workspace_id: workspace_id, "apps.name": "google_drive"})
                            integrationExists = Array.isArray(integrationExists)? integrationExists[0] : integrationExists;
                            
                            if (functions.empty(integrationExists)) {

                                // CREATE FOLDER
                                try {

                                    const drive_report = await drive.files.create({
                                        requestBody: {
                                            name: `SendBetter`,
                                            mimeType: 'application/vnd.google-apps.folder'
                                        },
                                        fields: 'id'
                                    });

                                    // SAVE CREDENTIALS

                                    await INTEGRATION.updateOne(
                                        { "token": token, "workspace_id": workspace_id },
                                        { "$push": { 
                                                "apps": {
                                                    "folder_id": drive_report.data.id,
                                                    "name": "google_drive",
                                                    "access_token": body.access_token,
                                                    "refresh_token": body.refresh_token,
                                                    "is_connected": true
                                                } 
                                            } 
                                        }
                                    )

                                } catch (error) {
                                    if(error){ throw new Error(error) }
                                }

                            }else{
                                await INTEGRATION.updateOne(
                                    { "token": token, "workspace_id": workspace_id, "apps.name": "google_drive"},
                                    { "$set": { 
                                            "apps.$.access_token": body.access_token,
                                            "apps.$.refresh_token": body.refresh_token,
                                            "apps.$.is_connected": true
                                        } 
                                    }
                                )
                            }

                        }

                        payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                        payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                        payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                        payload["integrations"] = body

                        response.redirect('https://sendbetter.io/integration_done')
                        // response.status(200).json({ "status": 200, "message": "Google Drive callback response.", "data": payload })

                    } catch (e) {
                        response.status(400).json({ "status": 400, "message": e.message, "data": payload });
                    }

                } else {
                    response.status(400).json({ "status": 400, "message": "User account access authentication credentials failed, check and retry.", "data": payload });
                }

            }else {
                response.status(400).json({ "status": 400, "message": "Access token missing or expired, check and retry.", "data": payload });
            }

        } catch (error) {
            response.status(400).json({ "status": 400, "message": error.message, "data": null });
        }
    })

}