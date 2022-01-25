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
    ContentType: 'video/mp4'
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

    app.post(`/${endpoint_category}/upload_video`, upload.single("file"), async (request, response) => {

        /* 
        token
        workspace_id
        file_base64
        file_url
        */

        if (request.body.token && request.body.workspace_id) {

            let payload = {
                is_verified: false,
                is_blocked: false,
                is_registered: false,
                token: request.query.token
            }

            let userExists = await USER.find({ token: request.body.token})
            let videoExists = await VIDEO.find({ token: request.body.token})
            
            if (!functions.empty(userExists)) {

                try {

                    if(!functions.empty(request.body.file_base64) && !functions.empty(request.body.file_url)){
                        throw new Error("You can't have file buffer and file url at the same time, use only one.")
                    }

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

                    // UPLOAD VIDEO TO AWS S3

                    // UPLOAD FROM FILE
                    if(request.body.file_base64){

                        let filename = "video_"+functions.uniqueId(30, "alphanumeric");
                        uploadParams.Key = filename;

                        let file_buffer = new Buffer.from(request.body.file_base64.replace("data:image/gif;base64,", "").replace("data:image/jpeg;base64,", "").replace("data:image/png;base64,", "").replace("data:video/mp4;base64,", "").replace("data:video/webm;base64,", "").replace("data:video/mov;base64,", "").replace("data:audio/mp3;base64,", "").replace("data:audio/mpeg;base64,", "").replace("data:audio/wav;base64,", ""), "base64")
                        uploadParams.Body = file_buffer;
                        const params = uploadParams;

                        s3Client.upload(params, async (error, data) => {
                            if (error) {
                                throw new Error(error.message)
                            }

                            let file_path = `https://${uploadParams.Bucket}.s3.${process.env.S3_REGION}.amazonaws.com/${filename}`
                            await VIDEO.create({
                                video_id: functions.uniqueId(10, "alphanumeric"),
                                author: userExists.name,
                                token: request.body.token,
                                workspace_id: request.body.workspace_id,
                                name: `New video ${functions.uniqueId(5, "number")}`,
                                url: file_path,
                                email_embed_code: `<div style="background-image:url(https://thumbnail.sendspark.com/animated/244k40wq334aicmbpjppv1f90q3qoxjk.5ce040d11da6691af7fc16711d23fcf6fd06e18f/sendspark-animated-thumbnail-244k40wq.gif);background-size:contain;background-repeat:no-repeat;background-position:center center;margin:0 auto;animation:playable-reveal 1s;overflow:hidden;"> <div style="position:relative;height:0;max-height:0;padding-bottom:56.25%;"> <video width="100%" height="auto" controls="controls" poster="https://thumbnail.sendspark.com/animated/244k40wq334aicmbpjppv1f90q3qoxjk.5ce040d11da6691af7fc16711d23fcf6fd06e18f/sendspark-animated-thumbnail-244k40wq.gif" src="https://stream.mux.com/L2FIt6ZYaFUwpr1we1ZDDW4w29EnCGnv/high.mp4" > <a href=https://sendspark.com/share/dg84k6urwjt3e61a> <img src="https://thumbnail.sendspark.com/animated/244k40wq334aicmbpjppv1f90q3qoxjk.5ce040d11da6691af7fc16711d23fcf6fd06e18f/sendspark-animated-thumbnail-244k40wq.gif" alt="Animated thumbnail for video" style="width: 100%;" > </a> </video> </div> </div>`,
                                website_embed_code: `<div style="position:relative;height:0;width:100%;padding-bottom:56.25%"><iframe src="https://sendspark.com/embed/244k40wq334aicmbpjppv1f90q3qoxjk" frameBorder="0" style="position:absolute;width:100%;height:100%;border-radius:6px;left:0;top:0" allowfullscreen=""></iframe></div>`
                            })
                        });

                    }else{
                        
                        // UPLOAD FROM URL
                        
                        if(request.body.file_url){
                            if(functions.validURL(request.body.file_url)){

                                let filename = "video_"+functions.uniqueId(30, "alphanumeric");
                                uploadParams.Key = filename;

                                uploadUrlToS3(request.body.file_url).then(async (data) => {
                                    let file_path = `https://${uploadParams.Bucket}.s3.${process.env.S3_REGION}.amazonaws.com/${filename}`
                                    await VIDEO.create({
                                        video_id: functions.uniqueId(10, "alphanumeric"),
                                        token: request.body.token,
                                        workspace_id: request.body.workspace_id,
                                        name: filename,
                                        url: file_path
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
                    payload["videos"] = videoExists,
                    response.status(200).json({ "status": 200, "message": "Hurray! video has uploaded successfully.", "data": payload });

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