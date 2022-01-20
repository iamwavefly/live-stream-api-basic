const dateUtil = require('date-fns');
const path = require("path");
const functions = require("../../utility/function.js")

const db = require("../../models");
const USER = db.user;
const TEAM = db.team;

// CACHE
const NodeCache = require('node-cache');
const cache_expiry = process.env.CACHE_EXPIRY_SECONDS;
const cache = new NodeCache({ stdTTL: cache_expiry, checkperiod: cache_expiry * 0.2, useClones: false });

module.exports = function (app) {
    let endpoint_category = path.basename(path.dirname(__filename));

    app.post(`/${endpoint_category}/create_team`, async (request, response) => {

        /* 
        token
        workspace_id
        name
        email
        password
        */

        if (request.body.token && request.body.workspace_id && request.body.name && request.body.email && request.body.password) {

            let payload = {
                is_verified: false,
                is_blocked: false,
                is_registered: false,
                token: request.query.token
            }

            let userExists = await USER.find({ token: request.body.token})
            let teamExists = await TEAM.find({ token: request.body.token, email: request.body.email, workspace_id: request.body.workspace_id})

            if (!functions.empty(userExists)) {
                
                if (functions.empty(teamExists)) {

                    try {

                        teamExists = Array.isArray(teamExists)? teamExists[0] : teamExists;
                        userExists = Array.isArray(userExists)? userExists[0] : userExists;

                        await TEAM.create({
                            team_id: functions.uniqueId(10, "alphanumeric"),
                            token: request.body.token,
                            workspace_id : request.body.workspace_id,
                            name: request.body.name,
                            email: request.body.email,
                            password: request.body.password
                        })

                        teamExists = await TEAM.find({ token: request.body.token, workspace_id: request.body.workspace_id})

                        payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                        payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                        payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                        payload["teams"] = teamExists,
                        response.status(200).json({ "status": 200, "message": "User team has been saved successfully.", "data": payload });
                    
                    } catch (e) {
                        response.status(400).json({ "status": 400, "message": e.message, "data": payload });
                    }

                } else {
                    response.status(400).json({ "status": 400, "message": "This team member already exists in your account, check and retry.", "data": payload });
                }

            } else {
                response.status(400).json({ "status": 400, "message": "User account access authentication credentials failed, check and retry.", "data": payload });
            }

        } else {
            response.status(400).json({ "status": 400, "message": "Incomplete or missing requests parameter(s)", "data": null });
        }

    })

}