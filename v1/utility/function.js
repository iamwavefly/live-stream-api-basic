const crypto = require("crypto");
const algorithm = "aes-256-ctr";
const secretKey = 'kxMrBDjUvYbsS87ryfiBrjgggZtyLvo4';
const url_request = require("request")
let countries = require('../json/countries.json');
let currencies = require('../json/currencies.json');
let languages = require('../json/languages.json');

"use strict"
var self = module.exports = {

    // GET TODAY'S DATE
    getTodayDate: () => {
        var todaysDate = new Date();
        var yyyy = todaysDate.getFullYear().toString();
        var mm = (todaysDate.getMonth() + 1).toString();
        var dd = todaysDate.getDate().toString();
        var mmChars = mm.split('');
        var ddChars = dd.split('');
        return yyyy + '-' + (mmChars[1] ? mm : "0" + mmChars[0]) + '-' + (ddChars[1] ? dd : "0" + ddChars[0]);
    },

    stringToBoolean: (string) => {
        if(self.empty(string)){
            return false;
        }else{
            string = typeof string == "string" ? string : string.toString();
            switch (string.toLowerCase().trim()) {
                case "true": case "yes": case "1": return true;
                case "false": case "no": case "0": case null: return false;
                default: return Boolean(string);
            }
        }
    },

    uniqueId: (length, type = "alphanumeric") => {
        var result = '';
        var characters = type == "number" ? '0123456789' : type == "alphabet" ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    },

    diffArray: (arr1, arr2) => {
        function diff(a, b) {
            return a.filter(item => b.indexOf(item) === -1);
        }

        var diff1 = diff(arr1, arr2)
        var diff2 = diff(arr2, arr1)
        return [].concat(diff1, diff2)
    },

    ucwords: (str) => {
        return (str + '').replace(/^(.)|\s+(.)/g, ($1) => {
            return $1.toUpperCase()
        })
    },

    ucfirst: (str) => {
        str += ''
        var f = str.charAt(0).toUpperCase()
        return f + str.substr(1)
    },

    empty: (mixedVar) => {
        var undef
        var key
        var i
        var len
        var emptyValues = [undef, null, false, 0, '', '0', 'null', 'undefined']

        for (i = 0, len = emptyValues.length; i < len; i++) {
            if (mixedVar === emptyValues[i] || typeof mixedVar == "undefined") {
                return true
            }
        }

        if (typeof mixedVar === 'object') {
            for (key in mixedVar) {
                if (mixedVar.hasOwnProperty(key)) {
                    return false
                }
            }
            return true
        }

        return false
    },

    stripHtml: (html) => {
        return html.replace(/<[^>]*>?/gm, '')
    },

    // VALIDATE EMAIL
    validateEmail: (email) => {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    },

    validatePassword: (password) => {
        if(self.empty(password)){ return false  }
        if(password.length < 8){ return false }
        return true;
    },

    // VALIDATE PHONE
    validatePhone: (phone) => {
        phone = typeof phone != "undefined" ? phone.toString() : "";
        if (phone.length < 10 || Number.isNaN(phone) == true || phone.substring(0, 1) != "+" || phone.substring(0, 3) == "000" || phone.length > 16) {
            return false;
        } else {
            var phone_regex = new RegExp(/^[+]?[\s./0-9]*[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/g);
            if (!phone_regex.test(phone)) {
                return false;
            } else {
                return true;
            }
        }
    },

    // URL DOWNLOADER
    downloadFromURL: (url, path, callback) => {
        try {
            if (Buffer.isBuffer(url)) {
                fs.writeFile(path, url, (error) => {
                    if (error) {
                        throw new Error(error);
                    } else {
                        callback({ status: 200, message: "File uploaded successfully", data: null })
                    }
                });
            } else {
                if (validator.isURL(url, { allow_underscores: true, require_protocol: true })) {
                    url_request({ url: url, followRedirect: true }, (err, res, body) => {
                        url_request(url).pipe(fs.createWriteStream(path)).on('close', (error, success) => {
                            if (error) {
                                fs.unlink(path);
                                callback({ status: 400, message: error, data: null })
                            } else {
                                callback({ status: 200, message: "File uploaded successfully", data: null })
                            };
                        })
                    })
                } else {
                    var url_refined = url.replace("data:image/gif;base64,", "").replace("data:image/jpeg;base64,", "").replace("data:image/png;base64,", "").replace("data:video/mp4;base64,", "").replace("data:video/webm;base64,", "").replace("data:video/mov;base64,", "").replace("data:audio/mp3;base64,", "").replace("data:audio/mpeg;base64,", "").replace("data:audio/wav;base64,", "");
                    var bitmap = new Buffer.from(url_refined, 'base64');
                    try {
                        fs.writeFileSync(path, bitmap);
                        callback({ status: 200, message: "File uploaded successfully", data: null })
                    } catch (error) {
                        callback({ status: 400, message: error.message || error, data: null })
                    }
                }
            }
        } catch (error) {
            callback({ status: 400, message: error.message || error, data: null })
        }
    },

    // BASE64 ENCODER AND DECODER
    base64: (string, action = "encode") => {
        const base64 = {
            decode: s => Buffer.from(s, 'base64'),
            encode: b => Buffer.from(b).toString('base64')
        };
        if (action == "encode") {
            return base64.encode(string)
        }
        if (action == "decode") {
            let buffer_text = Buffer.from(base64.decode(string)).toString()
            return buffer_text
        }
    },

    shorten: (arr, obj) => {
        arr.forEach((key) => {
            delete obj[key];
        });
        return obj;
    },

    sortObject: (obj) => {
        return Object.keys(obj).sort().reduce((result, key) => {
            result[key] = obj[key];
            return result;
        }, {});
    },

    paginateObject: (items, page, per_page) => {
        var page = page || 1,
            per_page = per_page || 10,
            offset = (page - 1) * per_page,

            paginatedItems = items.slice(offset).slice(0, per_page),
            total_pages = Math.ceil(items.length / per_page);
        return {
            page: Number(page),
            per_page: per_page,
            pre_page: page - 1 ? page - 1 : null,
            next_page: (total_pages > page) ? Number(page) + 1 : null,
            total: items.length,
            total_pages: total_pages,
            data: paginatedItems
        };
    },

    encrypt: (value) => {
        value = value.toString()
        const initVector = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, secretKey, initVector);
        const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
        let hash = {
            initVector: initVector.toString('hex'),
            content: encrypted.toString('hex')
        };
        return self.base64(JSON.stringify(hash), "encode")
    },

    decrypt: (hash) => {
        hash = JSON.parse(self.base64(hash, "decode"))
        const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(hash.initVector, 'hex'));
        const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()]);
        return decrpyted.toString();
    },

    validURL: (str) => {
        var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
            '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
        return !!pattern.test(str);
    },

    getCountryNameOrCode: (country, what_to_get = "code") => {
        if (what_to_get.toLowerCase() == "code") {
            var country_object = countries.filter((country_data) => { return country_data.name.toLowerCase() == country.toLowerCase() })
            return self.empty(country_object) ? '' : country_object[0].code.toLowerCase()
        } else {
            var country_object = countries.filter((country_data) => { return country_data.code.toLowerCase() == country.toLowerCase() })
            return self.empty(country_object) ? '' : country_object[0].name.toLowerCase()
        }
    },

    getCurrencyNameOrCode: (currency, what_to_get = "code") => {
        if (what_to_get.toLowerCase() == "code") {
            var currency_object = currencies.filter((currency_data) => { return currency_data.name.toLowerCase() == currency.toLowerCase() })
            return self.empty(currency_object) ? '' : currency_object[0].code.toLowerCase()
        } else {
            var currency_object = currencies.filter((currency_data) => { return currency_data.code.toLowerCase() == currency.toLowerCase() })
            return self.empty(currency_object) ? '' : currency_object[0].name.toLowerCase()
        }
    },

    sendSMS: (to, body, callback) => {
        self.sendSMSWithTermii(to, body, function (report) {
            callback({ status: report.status, message: report.message, data: report.data })
        })
    },

    sendEmail: (subject, to, body, type, callback) => {
        self.sendEmailWithElasticEmail(subject, to, body, type, function (report) {
            callback({ status: report.status, message: report.message, data: report.data })
        })
    },

    sendSMSWithTermii: (to, body, callback) => {
        var data = {
            "to": to,
            "from": process.env.APP_NAME,
            "sms": body,
            "type": "plain",
            "channel": "dnd",
            "api_key": process.env.TERMII_API_KEY,
        };
        var options = {
            'method': 'POST',
            'url': 'https://termii.com/api/sms/send',
            'headers': {
                'Content-Type': ['application/json', 'application/json']
            },
            body: JSON.stringify(data)
        };
        url_request(options, function (error, response) {
            if (error) throw new Error(error);
            callback({ status: 200, message: "", data: response.body })
        });
    },

    sendEmailWithElasticEmail: (subject, to, body, type, callback) => {
        var options;
        url = `https://api.elasticemail.com/v2/email/send?`
        options = {
            method: 'POST',
            url: 'https://api.elasticemail.com/v2/email/send',
            headers: {
                'cache-control': 'no-cache',
                'content-type': 'application/x-www-form-urlencoded'
            },
            form: {
                "apikey": process.env.ELASTICEMAIL_API_KEY,
                "subject": subject,
                "from": process.env.APP_EMAIL,
                "fromName": process.env.APP_NAME,
                "replyTo": process.env.APP_EMAIL,
                "replyToName": process.env.APP_NAME,
                "to": to,
                "isTransactional": true,
                "bodyHtml": body
            },
            json: true
        }
        url_request(options, function (err, res, body) {
            if (self.empty(err)) {
                if (body.success == false) {
                    callback({ status: 400, message: body.error, data: null })
                } else {
                    callback({ status: 200, message: "", data: null })
                }
            } else {
                callback({ status: 400, message: "An error was encountered while sending email to email address.", data: null })
            }
        })
    }

}