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
const FEEDBACK = db.feedback;

const s3Client = new AWS.S3({
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    region: process.env.S3_REGION
});

const uploadParams = {
    Bucket: process.env.S3_BUCKET, 
    Key: null,
    Body: null,
};

const uploadUrlToS3 = (url) => {
    return axios.get(url, { responseType: "arraybuffer", responseEncoding: "binary" }).then((response) => {
        const params = {
            ContentType: response.headers["content-type"],
            ContentLength: response.data.length.toString(), // or response.header["content-length"] if available for the type of file downloaded
            Bucket: uploadParams.Bucket,
            Body: response.data,
            Key: uploadParams.Key,
        };
        return s3Client.putObject(params).promise();
    });
}

// CACHE
const NodeCache = require('node-cache');
const cache_expiry = process.env.CACHE_EXPIRY_SECONDS;
const cache = new NodeCache({ stdTTL: cache_expiry, checkperiod: cache_expiry * 0.2, useClones: false });

module.exports = function (app) {
    let endpoint_category = path.basename(path.dirname(__filename));

    app.post(`/${endpoint_category}/create_feedback`, upload.single("file"), async (request, response) => {

        /* 
        token
        workspace_id
        name
        email
        type
        file_buffer
        file_url
        text
        */

        if (request.body.token && request.body.workspace_id && request.body.name && request.body.email && request.body.type) {

            let payload = {
                is_verified: false,
                is_blocked: false,
                is_registered: false,
                token: request.query.token
            }

            let userExists = await USER.find({ token: request.body.token})
            let feedbackExists = await FEEDBACK.find({ token: request.body.token, workspace_id: request.body.workspace_id})
            
            if (!functions.empty(userExists)) {

                try {

                    if(!functions.empty(request.body.file_buffer) && !functions.empty(request.body.file_url)){
                        throw new Error("You can't have file buffer and file url at the same time, use only one.")
                    }

                    userExists = Array.isArray(userExists)? userExists[0] : userExists;
                    feedbackExists = Array.isArray(feedbackExists)? feedbackExists[0] : feedbackExists;

                    // Check if token has expired
                    const difference = Math.abs(dateUtil.differenceInMinutes(new Date(userExists.token_expiry), new Date()))
                    if (difference > process.env.TOKEN_EXPIRY_MINUTES) {
                        payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                        payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                        payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                        throw new Error("This user authentication token has expired, login again retry.")
                    }

                    // UPLOAD FEEDBACK TO AWS S3

                    // UPLOAD FROM FILE
                    if(request.body.file_buffer){

                        let filename = "feedback_"+functions.uniqueId(30, "alphanumeric");
                        uploadParams.Key = filename;

                        uploadParams.Body = request.body.file_buffer;
                        const params = uploadParams;

                        s3Client.upload(params, async (error, data) => {
                            if (error) {
                                throw new Error(error.message)
                            }

                            let file_path = `https://${uploadParams.Bucket}.s3.${process.env.S3_REGION}.amazonaws.com/${filename}`
                            await FEEDBACK.create({
                                token: request.body.token,
                                workspace_id: request.body.workspace_id,
                                name: request.body.name,
                                email: request.body.email,
                                type: request.body.type,
                                url: file_path,
                            })
                        });

                    }else{
                        
                        // UPLOAD FROM URL
                        
                        if(request.body.file_url){
                            if(functions.validURL(request.body.file_url)){

                                let filename = "feedback_"+functions.uniqueId(30, "alphanumeric");
                                uploadParams.Key = filename;

                                uploadUrlToS3(request.body.file_url).then(async (data) => {
                                    let file_path = `https://${uploadParams.Bucket}.s3.${process.env.S3_REGION}.amazonaws.com/${filename}`
                                    await FEEDBACK.create({
                                        token: request.body.token,
                                        workspace_id: request.body.workspace_id,
                                        name: request.body.name,
                                        email: request.body.email,
                                        type: request.body.type,
                                        url: file_path,
                                    })
                                }).catch((error) => {
                                    throw new Error(error.message)
                                })

                            }else{
                                throw new Error("File to be uploaded is not a valid url, check and retry.")
                            }
                        }else{
                            throw new Error("No file to upload found, check and try again.")
                        }
                    }

                    payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                    payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                    payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                    payload["feedbacks"] = feedbackExists,
                    response.status(200).json({ "status": 200, "message": "Hurray! feedback has been saved successfully.", "data": payload });

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