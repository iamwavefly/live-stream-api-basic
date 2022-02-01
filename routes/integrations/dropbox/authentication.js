const path = require("path");
const dateUtil = require('date-fns');
const db = require("../../../models");
const functions = require("../../../utility/function.js")
const USER = db.user;
const INTEGRATION = db.integration;

module.exports = function (app) {
    let endpoint_directory = path.basename(path.dirname(__dirname));
    let endpoint_category = path.basename(path.dirname(__filename));

    app.get(`/${endpoint_directory}/${endpoint_category}/authentication`, async (request, response, next) => {
        try {  

            if (request.query.token && request.query.workspace_id) {

            const REDIRECT_URL = `https://sparkle-test.herokuapp.com/integrations/dropbox/callback`;
            
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

                    let redirect_url = `https://www.dropbox.com/1/oauth2/authorize?client_id=${process.env.DBX_APP_KEY}&token_access_type=offline&response_type=code&redirect_uri=${REDIRECT_URL}&state=${`${request.query.token}_SEPARATOR_${request.query.workspace_id}`}`;
                    response.status(200).json({ "status": 200, "message": "Dropbox authentication response.", "data": redirect_url })

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