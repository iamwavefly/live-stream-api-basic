const dateUtil = require('date-fns');
const path = require("path");
const functions = require("../../utility/function.js")

const db = require("../../models");
const USER = db.user;
const VIDEO = db.video;
const WORKSPACE = db.workspace;
const TEAM = db.team;

// CACHE
const NodeCache = require('node-cache');
const cache_expiry = process.env.CACHE_EXPIRY_SECONDS;
const cache = new NodeCache({ stdTTL: cache_expiry, checkperiod: cache_expiry * 0.2, useClones: false });

module.exports = function (app) {
    let endpoint_category = path.basename(path.dirname(__filename));

    app.get(`/${endpoint_category}/all_stats`, async (request, response) => {

        /* 
        token
        */

        if (request.query.token) {

            let payload = {
                is_verified: false,
                is_blocked: false,
                is_registered: false,
                token: ""
            }

            let userExists = await USER.find({token: request.query.token})
            let videoExists = await VIDEO.find({token: request.query.token})
            let workspaceExists = await WORKSPACE.find({token: request.query.token})
            let teamExists = await TEAM.find({token: request.query.token})

            if (!functions.empty(userExists)) {

                try {

                    userExists = Array.isArray(userExists)? userExists[0] : userExists;

                    // Check if token has expired
                    const difference = Math.abs(dateUtil.differenceInMinutes(new Date(userExists.token_expiry), new Date()))
                    if (difference > process.env.TOKEN_EXPIRY_MINUTES) {
                        payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                        payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                        payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                        throw new Error("This user authentication token has expired, login again retry.")
                    }

                    let stats_object = {
                        total_visits: videoExists.reduce((accumulator, current) => accumulator + current.visits, 0),
                        total_plays: videoExists.reduce((accumulator, current) => accumulator + current.plays, 0),
                        total_clicks: videoExists.reduce((accumulator, current) => accumulator + current.clicks, 0),
                        total_likes: videoExists.reduce((accumulator, current) => accumulator + current.likes, 0),
                        total_workspaces: workspaceExists.length,
                        total_videos: videoExists.length,
                        total_team: teamExists.length
                    }
                    
                    payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                    payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                    payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                    payload["token"] = userExists.token
                    payload["stats"] = stats_object,
                    response.status(200).json({ "status": 200, "message": "All account stats has been set successfully.", "data": payload });
                
                } catch (e) {
                    response.status(400).json({ "status": 400, "message": e.message, "data": payload });
                }

            } else {
                response.status(400).json({ "status": 400, "message": "User account access authentication credentials failed, check and retry.", "data": payload });
            }

        } else {
            response.status(400).json({ "status": 400, "message": "Incomplete or missing requests parameter(s)", "data": null });
        }

    })

}