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

    app.post(`/${endpoint_category}/create_workspace`, async (request, response) => {

        /* 
        token
        name
        category
        */

        if (request.body.token && request.body.name && request.body.category) {

            let payload = {
                is_verified: false,
                is_blocked: false,
                is_registered: false,
                token: request.query.token
            }

            let userExists = await USER.find({ token: request.body.token})
            let workspaceExists = await WORKSPACE.find({ token: request.body.token, name: request.body.name})
            
            if (!functions.empty(userExists)) {
                
                if (functions.empty(workspaceExists)) {

                    try {

                        userExists = Array.isArray(userExists)? userExists[0] : userExists;

                        await WORKSPACE.create({
                            workspace_id: functions.uniqueId(10, "alphanumeric"),
                            token: request.body.token,
                            name: request.body.name,
                            category: request.body.category
                        })

                        workspaceExists = await WORKSPACE.find({ token: request.body.token})

                        payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                        payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                        payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                        payload["workspaces"] = workspaceExists,
                        response.status(200).json({ "status": 200, "message": "User workspaces has been saved successfully.", "data": payload });
                    
                    } catch (e) {
                        response.status(400).json({ "status": 400, "message": e.message, "data": payload });
                    }

                } else {
                    response.status(400).json({ "status": 400, "message": "This workspace already exists in your account, check and retry.", "data": payload });
                }

            } else {
                response.status(400).json({ "status": 400, "message": "User account access authentication credentials failed, check and retry.", "data": payload });
            }

        } else {
            response.status(400).json({ "status": 400, "message": "Incomplete or missing requests parameter(s)", "data": null });
        }

    })

}