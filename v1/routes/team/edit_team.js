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

    app.put(`/${endpoint_category}/edit_team`, async (request, response) => {

        /* 
        token
        team_id
        name
        email
        password
        */

        if (request.body.token && request.body.team_id) {

            let payload = {
                is_verified: false,
                is_blocked: false,
                is_registered: false,
                token: request.query.token
            }

            let userExists = await USER.find({ token: request.body.token})
            let teamExists = await TEAM.find({ token: request.body.token, team_id: request.body.team_id})

            if (!functions.empty(teamExists)) {
                try {

                    teamExists = Array.isArray(teamExists)? teamExists[0] : teamExists;
                    userExists = Array.isArray(userExists)? userExists[0] : userExists;

                    await TEAM.findOneAndUpdate(
                        {token: userExists.token, team_id: request.body.team_id },
                        {
                            name: functions.empty(request.body.name)? teamExists.name : request.body.name,
                            email: functions.empty(request.body.email)? teamExists.email : request.body.email,
                            password: functions.empty(request.body.password)? teamExists.password : request.body.password
                        }
                    );

                    payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                    payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                    payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                    payload["teams"] = teamExists,
                    response.status(200).json({ "status": 200, "message": "User teams has been edited successfully.", "data": payload });
                
                } catch (e) {
                    response.status(400).json({ "status": 400, "message": e.message, "data": payload });
                }

            } else {
                response.status(400).json({ "status": 400, "message": "User team credentials doesn't match any record, check and retry.", "data": payload });
            }

        } else {
            response.status(400).json({ "status": 400, "message": "Incomplete or missing requests parameter(s)", "data": null });
        }

    })

}