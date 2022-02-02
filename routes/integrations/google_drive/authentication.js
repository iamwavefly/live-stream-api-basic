const path = require("path");
const dateUtil = require('date-fns');
const db = require("../../../models");
const { google } = require('googleapis');
const functions = require("../../../utility/function.js")
const USER = db.user;
const INTEGRATION = db.integration;

module.exports = function (app) {
    let endpoint_directory = path.basename(path.dirname(__dirname));
    let endpoint_category = path.basename(path.dirname(__filename));

    app.get(`/${endpoint_directory}/${endpoint_category}/authentication`, async (request, response, next) => {
        try {  

            if (request.query.token && request.query.workspace_id) {

            const REDIRECT_URL = `${process.env.REDIRECT_URL}/integrations/google_drive/callback`;
            
                let payload = {
                    is_verified: false,
                    is_blocked: false,
                    is_registered: false,
                    token: request.query.token
                }

                let userExists = await USER.find({ token: request.query.token})
                let integrationExists = await INTEGRATION.find({ token: request.query.token, workspace_id: request.query.workspace_id})
                
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

                    const oauth2Client = new google.auth.OAuth2(
                        process.env.GOOGLE_CLIENT_ID,
                        process.env.GOOGLE_CLIENT_SECRET,
                        `${REDIRECT_URL}`
                    );

                    const scopes = [
                        'https://www.googleapis.com/auth/drive.file'
                    ];

                    const redirect_url = oauth2Client.generateAuthUrl({
                        access_type: 'offline',
                        scope: scopes,
                        state: `${request.query.token}_SEPARATOR_${request.query.workspace_id}`
                    });

                    response.status(200).json({ "status": 200, "message": "Google Drive authentication response.", "data": redirect_url })

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