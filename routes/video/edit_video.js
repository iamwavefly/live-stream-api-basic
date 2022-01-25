const dateUtil = require('date-fns');
const path = require("path");
const functions = require("../../utility/function.js")
const AWS = require('aws-sdk');
const multer = require('multer');
const axios = require('axios');
const storage = multer.memoryStorage()
const upload = multer({storage: storage});

const db = require("../../models");
const USER = db.user;
const VIDEO = db.video;

const s3Client = new AWS.S3({
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    region: process.env.S3_REGION
});

const uploadParams = {
    Bucket: process.env.S3_BUCKET, 
    Key: null,
    Body: null,
    ContentEncoding: 'base64',
    ContentType: 'image/jpeg'
};

// CACHE
const NodeCache = require('node-cache');
const cache_expiry = process.env.CACHE_EXPIRY_SECONDS;
const cache = new NodeCache({ stdTTL: cache_expiry, checkperiod: cache_expiry * 0.2, useClones: false });

module.exports = function (app) {
    let endpoint_category = path.basename(path.dirname(__filename));

    app.put(`/${endpoint_category}/edit_video`, upload.single("file"), async (request, response) => {

        /* 
        token
        video_id
        name
        "page": {
            "logo": {
                "url": ""
            },
            "title": {
                "text": "",
                "color": ""
            },
            "description": {
                "text": "",
                "color": ""
            },
            "call_to_action": {
                "text": "",
                "color": "",
                "font": "",
                "url": "",
                "radius": ""
            }
        }
        */

        if (request.body.token && request.body.video_id) {

            let payload = {
                is_verified: false,
                is_blocked: false,
                is_registered: false,
                token: request.body.token
            }

            let userExists = await USER.find({ token: request.body.token})
            let videoExists = await VIDEO.find({ token: request.body.token, video_id: request.body.video_id})

            if (!functions.empty(userExists)) {

                if (!functions.empty(videoExists)) {

                    try {

                        userExists = Array.isArray(userExists)? userExists[0] : userExists;
                        videoExists = Array.isArray(videoExists)? videoExists[0] : videoExists;

                        // Check if token has expired
                        const difference = Math.abs(dateUtil.differenceInMinutes(new Date(userExists.token_expiry), new Date()))
                        if (difference > process.env.TOKEN_EXPIRY_MINUTES) {
                            payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                            payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                            payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                            throw new Error("This user authentication token has expired, login again retry.")
                        }


                        // UPLOAD FROM FILE
                        if(request.body.page.logo.url){

                            let filename = "brand_logo_"+request.body.token;
                            uploadParams.Key = filename;

                            let file_buffer = new Buffer.from(request.body.page.logo.url.replace("data:image/gif;base64,", "").replace("data:image/jpeg;base64,", "").replace("data:image/png;base64,", "").replace("data:video/mp4;base64,", "").replace("data:video/webm;base64,", "").replace("data:video/mov;base64,", "").replace("data:audio/mp3;base64,", "").replace("data:audio/mpeg;base64,", "").replace("data:audio/wav;base64,", ""), "base64")
                            uploadParams.Body = file_buffer;
                            const params = uploadParams;

                            s3Client.putObject(params, async (error, data) => {

                                if (error) {
                                    throw new Error(error.message)
                                }

                                let file_path = `https://${uploadParams.Bucket}.s3.${process.env.S3_REGION}.amazonaws.com/${filename}`
                                
                                await VIDEO.updateOne(
                                    {token: request.body.token, video_id: request.body.video_id },
                                    {   "$set": {
                                            "page.logo.url": functions.empty(request.body.page.logo.url)? videoExists.page.logo.url : file_path,
                                            "page.title.text": functions.empty(request.body.page.title.text)? videoExists.page.title.text : request.body.page.title.text,
                                            "page.title.color": functions.empty(request.body.page.title.color)? videoExists.page.title.color : request.body.page.title.color,
                                            "page.description.text": functions.empty(request.body.page.description.text)? videoExists.page.description.text : request.body.page.description.text,
                                            "page.description.color": functions.empty(request.body.page.description.color)? videoExists.page.description.color : request.body.page.description.color,
                                            "page.call_to_action.text": functions.empty(request.body.page.call_to_action.text)? videoExists.page.call_to_action.text : request.body.page.call_to_action.text,
                                            "page.call_to_action.color": functions.empty(request.body.page.call_to_action.color)? videoExists.page.call_to_action.color : request.body.page.call_to_action.color,
                                            "page.call_to_action.font": functions.empty(request.body.page.call_to_action.font)? videoExists.page.call_to_action.font : request.body.page.call_to_action.font,
                                            "page.call_to_action.url": functions.empty(request.body.page.call_to_action.url)? videoExists.page.call_to_action.url : request.body.page.call_to_action.url,
                                            "page.call_to_action.radius": functions.empty(request.body.page.call_to_action.radius)? videoExists.page.call_to_action.radius : request.body.page.call_to_action.radius,
                                        }
                                    }
                                );

                            });

                        }else{
                            await VIDEO.updateOne(
                                {token: request.body.token, video_id: request.body.video_id },
                                {   "$set": {
                                        "page.logo.url": functions.empty(request.body.page.logo.url)? videoExists.page.logo.url : "",
                                        "page.title.text": functions.empty(request.body.page.title.text)? videoExists.page.title.text : request.body.page.title.text,
                                        "page.title.color": functions.empty(request.body.page.title.color)? videoExists.page.title.color : request.body.page.title.color,
                                        "page.description.text": functions.empty(request.body.page.description.text)? videoExists.page.description.text : request.body.page.description.text,
                                        "page.description.color": functions.empty(request.body.page.description.color)? videoExists.page.description.color : request.body.page.description.color,
                                        "page.call_to_action.text": functions.empty(request.body.page.call_to_action.text)? videoExists.page.call_to_action.text : request.body.page.call_to_action.text,
                                        "page.call_to_action.color": functions.empty(request.body.page.call_to_action.color)? videoExists.page.call_to_action.color : request.body.page.call_to_action.color,
                                        "page.call_to_action.font": functions.empty(request.body.page.call_to_action.font)? videoExists.page.call_to_action.font : request.body.page.call_to_action.font,
                                        "page.call_to_action.url": functions.empty(request.body.page.call_to_action.url)? videoExists.page.call_to_action.url : request.body.page.call_to_action.url,
                                        "page.call_to_action.radius": functions.empty(request.body.page.call_to_action.radius)? videoExists.page.call_to_action.radius : request.body.page.call_to_action.radius,
                                    }
                                }
                            );
                        }


                        videoExists = await VIDEO.find({ token: request.body.token, video_id: request.body.video_id})
                        videoExists = Array.isArray(videoExists)? videoExists[0] : videoExists;

                        payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                        payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                        payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                        payload["video"] = videoExists,
                        response.status(200).json({ "status": 200, "message": "Video has been edited successfully.", "data": payload });
                    
                    } catch (e) {
                        response.status(400).json({ "status": 400, "message": e.message, "data": payload });
                    }

                } else {
                    response.status(400).json({ "status": 400, "message": "This video credentials doesn't match any record, check and retry.", "data": payload });
                }

            } else {
                response.status(400).json({ "status": 400, "message": "User account access authentication credentials failed, check and retry.", "data": payload });
            }

        } else {
            response.status(400).json({ "status": 400, "message": "Incomplete or missing requests parameter(s)", "data": null });
        }

    })

}