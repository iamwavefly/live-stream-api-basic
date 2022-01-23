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

    app.put(`/${endpoint_category}/edit_workspace`, async (request, response) => {

        /* 
        token
        workspace_id
        name
        category
        */

        if (request.body.token && request.body.workspace_id) {

            let payload = {
                is_verified: false,
                is_blocked: false,
                is_registered: false,
                token: request.query.token
            }

            let userExists = await USER.find({ token: request.body.token})
            let workspaceExists = await WORKSPACE.find({ token: request.body.token, workspace_id: request.body.workspace_id})

            if (!functions.empty(workspaceExists)) {
                try {

                    workspaceExists = Array.isArray(workspaceExists)? workspaceExists[0] : workspaceExists;
                    userExists = Array.isArray(userExists)? userExists[0] : userExists;

                    await WORKSPACE.updateOne(
                        {token: userExists.token, workspace_id: request.body.workspace_id },
                        {
                            name: functions.empty(request.body.name)? workspaceExists.name : request.body.name,
                            category: functions.empty(request.body.category)? workspaceExists.category : request.body.category
                        }
                    );

                    workspaceExists = await WORKSPACE.find({ token: request.body.token, workspace_id: request.body.workspace_id})
                    workspaceExists = Array.isArray(workspaceExists)? workspaceExists[0] : workspaceExists;

                    payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                    payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                    payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                    payload["workspaces"] = workspaceExists,
                    response.status(200).json({ "status": 200, "message": "User workspaces has been edited successfully.", "data": payload });
                
                } catch (e) {
                    response.status(400).json({ "status": 400, "message": e.message, "data": payload });
                }

            } else {
                response.status(400).json({ "status": 400, "message": "User workspace credentials doesn't match any record, check and retry.", "data": payload });
            }

        } else {
            response.status(400).json({ "status": 400, "message": "Incomplete or missing requests parameter(s)", "data": null });
        }

    })

}