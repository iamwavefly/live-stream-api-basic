const path = require("path");
const dateUtil = require('date-fns');
const db = require("../../../models");
const functions = require("../../../utility/function.js")
var request_url = require('request');

const USER = db.user;
const INTEGRATION = db.integration;

module.exports = function (app) {
    let endpoint_directory = path.basename(path.dirname(__dirname));
    let endpoint_category = path.basename(path.dirname(__filename));

    app.post(`/${endpoint_directory}/${endpoint_category}/fetch`, async (request, response, next) => {
        try {  

            if (request.query.token && request.query.workspace_id) {

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

                    var options = {
                        'method': 'POST',
                        'url': `https://api.dropboxapi.com/2/files/list_folder`,
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${integrationExists.access_token}`
                        },
                        json: true,
                        body: {
                            "path": "/SendBetter",
                            "recursive": true,
                            "include_media_info": true,
                            "include_deleted": false,
                            "include_non_downloadable_files": false
                        },
                    };
                    request_url(options, function (error, report) {
                        if (error) throw new Error(error);
                        let fetched_files = report.body.entries.filter((files) => {return files[".tag"].toLowerCase() == "file"})
                        response.status(200).json({ "status": 200, "message": "Dropbox callback response.", "data": fetched_files})
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