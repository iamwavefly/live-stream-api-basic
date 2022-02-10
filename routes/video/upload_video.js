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
                    let generated_video_id = functions.uniqueId(10, "alphanumeric");

                    functions.uploadCloudinaryFile(request.body.file_base64, "sendbetter", "video/mp4", async function(report){
                        if(report.status == 400){
                            throw new Error (report.message)
                        }

                        let file_public_id = report.data.public_id
                        let ordinary_secure_url = report.data.secure_url.replace("/video/upload/", "/video/upload/c_scale,w_600/")
                        let file_with_button_secure_url = ordinary_secure_url.replace("/video/upload/", "/video/upload/c_scale,g_center,l_sendbetter:play_button,w_100/c_scale,w_600,e_loop/")
                        let animated_image_url = file_with_button_secure_url.replace(".mp4", ".gif")
                        let still_image_url = file_with_button_secure_url.replace(".mp4", ".png")

                        functions.generateCloudinaryAnimatedImage(file_public_id)
                        functions.generateCloudinaryStillImage(file_public_id)

                        await VIDEO.create({
                            video_id: generated_video_id,
                            token: request.body.token,
                            workspace_id: request.body.workspace_id,
                            name: "video_"+functions.uniqueId(30, "alphanumeric"),
                            url: ordinary_secure_url,
                            animated_image: animated_image_url,
                            still_image: still_image_url,
                            cloudinary_public_id: file_public_id,
                            share_link: `https://sendbetter.io/share/${generated_video_id}`,
                            email_embed_code: `<div style="background-image:url(${animated_image_url});background-size:contain;background-repeat:no-repeat;background-position:center center;margin:0 auto;animation:playable-reveal 1s;overflow:hidden;">
                                <div style="position:relative;height:0;max-height:0;padding-bottom:75%;">
                                    <video width="100%"
                                    height="auto"
                                    controls="controls"
                                    poster="${animated_image_url}" src="${ordinary_secure_url}"
                                    >
                                    <a href="https://sendbetter.io/share/${generated_video_id}">
                                        <img src="${animated_image_url}" alt="Animated thumbnail for video" style="width: 100%;" >
                                    </a>
                                    </video>
                                </div>
                            </div>`,
                            website_embed_code: `<div style="position:relative;height:0;width:100%;padding-bottom:62.5%"><iframe src="https://sendbetter.io/embed/${generated_video_id}" frameBorder="0" style="position:absolute;width:100%;height:100%;border-radius:6px;left:0;top:0" allowfullscreen=""></iframe></div>`
                        })

                        https://res.cloudinary.com/bluecode-technology/image/upload/c_scale,q_100,w_120/v1644492298/sendbetter/play-blue_fl4xmz.svg

                        videoExists = await VIDEO.find({ token: request.body.token, video_id: generated_video_id})
                        videoExists = Array.isArray(videoExists)? videoExists[0] : videoExists;
                                            
                        payload["is_verified"] = functions.stringToBoolean(userExists.is_verified)
                        payload["is_blocked"] = functions.stringToBoolean(userExists.is_blocked)
                        payload["is_registered"] = functions.stringToBoolean(userExists.is_registered)
                        payload["videos"] = videoExists,
                        response.status(200).json({ "status": 200, "message": "Hurray! video has uploaded successfully.", "data": payload });

                    })

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