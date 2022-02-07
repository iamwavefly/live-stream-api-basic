const dateUtil = require('date-fns');
const path = require("path");
const functions = require("../../utility/function.js")

const db = require("../../models");
const USER = db.user;
const WORKSPACE = db.workspace;

// CACHE
const NodeCache = require('node-cache');
const cache_expiry = process.env.CACHE_EXPIRY_SECONDS;
const cache = new NodeCache({ stdTTL: cache_expiry, checkperiod: cache_expiry * 0.2, useClones: false });

module.exports = function (app) {
    let endpoint_category = path.basename(path.dirname(__filename));

    app.put(`/${endpoint_category}/set_feedback_intro`, async (request, response) => {

        /* 
        token,
        workspace_id,
        introduction
        */

        if (request.body.token && request.body.workspace_id && request.body.introduction) {

            let payload = {
                is_verified: false,
                is_blocked: false,
                is_registered: false,
                token: request.body.token
            }

            let userExists = await USER.find({ token: request.body.token})
            let workspaceExists = await WORKSPACE.find({ token: request.body.token, workspace_id: request.body.workspace_id})

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

                    // Check if cached is expired
                    const cache_key = `${request.route.path}_${request.body.token}`;
                    if (cache.has(cache_key)) {
                        const report = cache.get(cache_key);
                        payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                        payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                        payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                        payload["feedbacks"] = report
                        response.status(200).json({ "status": 200, "message":`User account details has been fetched successfully.`, "data": payload });
                        return true;
                    }

                    await WORKSPACE.updateOne(
                        {token: userExists.token, workspace_id: request.body.workspace_id },
                        {
                            feedback_introduction: functions.empty(request.body.introduction)? workspaceExists.feedback_introduction : request.body.introduction
                        }
                    );

                    workspaceExists = await WORKSPACE.find({ token: request.body.token, workspace_id: request.body.workspace_id})
                    workspaceExists = Array.isArray(workspaceExists)? workspaceExists[0] : workspaceExists;

                    payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                    payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                    payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                    payload["workspace"] = workspaceExists,

                    response.status(200).json({ "status": 200, "message":"Workspace feedbacks has been updated successfully.", "data": payload });
                
                } catch (e) {
                    response.status(400).json({ "status": 400, "message": e.message, "data": payload });
                }

            } else {
                response.status(400).json({ "status": 400, "message":"User account access authentication credentials failed, check and retry.", "data": payload });
            }

        } else {
            response.status(400).json({ "status": 400, "message":"Incomplete or missing requests parameter(s)", "data": null });
        }

    })

}