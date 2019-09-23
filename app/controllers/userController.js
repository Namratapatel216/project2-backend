const express = require('express');
const app = express();
const appConfig = require('./../../config/config');
const Logger = require('./../libs/loggerLibs');
const Response = require('./../libs/responseLibs');
const Check = require('./../libs/checkLibs');
const validateInput = require('./../libs/validateInput');
const timeLib = require('./../libs/timeLibs');
const passwordLib = require('./../libs/passwordLibs');
const EmailLibs = require('./../libs/emailLibs');
const TokenLib = require('./../libs/tokenLibs');
const mongoose = require('mongoose');
const UserModel = mongoose.model('User');
const shortid = require('shortid');
const AuthModel = mongoose.model('auth');
const Verifier = require('email-verifier');
var nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
var smtpTransport = require('nodemailer-smtp-transport');
var mailAccountUser = 'plannermeeting65@gmail.com';
var mailAccountPassword = 'Namrata21';
var transport = nodemailer.createTransport(smtpTransport({
    service: 'gmail',
    secure: false, // use SSL
    port: 25, // port for secure SMTP
    auth: {
        user: mailAccountUser,
        pass: mailAccountPassword
    },
    tls: {
        // do not fail on invalid certs
        rejectUnauthorized: false
    }
}));
const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);
function encrypt(text) {
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
}
function decrypt(text) {
    let iv = Buffer.from(text.iv, 'hex');
    let encryptedText = Buffer.from(text.encryptedData, 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

//function to get all user list
let getallUser = (req, res) => {
    UserModel.find({'is_verified' : true})
    .lean()
    .select('-__V -_id')
    .exec((err,result) => {
        if(err)
        {
            Logger.error(err.message,"User Controller : get all user()",10);
            let apiresponse = Response.generate(true,"Failed to get all user list",500,null);
            res.send(apiresponse);
        }
        else if(Check.isEmpty(result))
        {
            Logger.Info("User Not Found","User Controller : get all user()",10);
            let apiresponse = Response.generate(true,"User Not Found",404,null);
            res.send(apiresponse);
        }
        else
        {
            let apiresponse = Response.generate(false,"User Listed",200,result);
            res.send(apiresponse);
        }
    });
}//end of get all user list function

//signup functionality starts
let SignUp = (req, res) => {

    //if user sign up with facebook and google
    if (req.body.signup_with === 'facebook' || req.body.signup_with === 'google') {
        UserModel.findOne({ email: req.body.email })
            .exec((err, result) => {
                if (err) {
                    Logger.error(err.message, "User Controller : Create USer()", 10);
                    let apiResponse = Response.generate(true, "Failed To create user", 500, null);
                    res.send(apiResponse);
                }
                else if (Check.isEmpty(result)) {
                    let newUser = new UserModel({
                        userId: shortid.generate(),
                        userName: req.body.userName,
                        email: req.body.email,
                        provider: req.body.provider,
                        provider_id: req.body.provider_id,
                        provider_pic: req.body.provider_pic,
                        createdOn: timeLib.now(),
                        socialPlatform: req.body.signup_with,
                        is_verified: true
                    });
                    newUser.save((err, newUser) => {
                        if (err) {
                            Logger.error(err.message, "User Controller : Cretae USer()", 10);
                            let apiResponse = Response.generate(true, "Failed To create USer", 500, null);
                            res.send(apiResponse);
                        }
                        else {
                            let apiResponse = Response.generate(false, `You are successfully registered into the system through your ${req.body.signup_with} account`, 200, newUser);
                            res.send(apiResponse);
                        }
                    });
                }
                else {
                    Logger.Info("Email already Exists", "User Controller : Create USer()", 10);
                    let apiResponse = Response.generate(true, "Email already Exists", 500, null);
                    res.send(apiResponse);
                }
            });
    }
    else {
        //function to validate email and password
        let validateUserInput = () => {
            return new Promise((resolve, reject) => {

                if (req.body.email) {
                    if (!validateInput.Email(req.body.email)) {
                        Logger.Info("Incorrect Email Address", "User Contoller : Validate USer Input()", 10);
                        let apiResponse = Response.generate(true, "Incorrect email", 500, null);
                        reject(apiResponse);
                    }
                    else if (!validateInput.Password(req.body.password)) {
                        Logger.Info("Password Does Not met Requirements", "USer Controller : Validate USer Input()", 10);
                        let apiResponse = Response.generate(true, "Password does not met requirement", 500, null);
                        reject(apiResponse);
                    }
                    else {
                        //resolve(req);
                        let verifier = new Verifier("at_OOVsxldsunAQkJVskHFKr3Xueq4y1");
                        verifier.verify(req.body.email, (err, data) => {
                            if (err) {
                                //console.log(err);
                                Logger.Info("Email address is invalid or not exist", "USer Controller : Validate USer Input()", 10);
                                let apiResponse = Response.generate(true, "Email address is invalid or not exist", 500, null);
                                reject(apiResponse);
                            }
                            else {
                                if (data['smtpCheck'] === 'false') {
                                    console.log(data['smtpCheck']);
                                    Logger.Info("Email address is invalid or not exist", "USer Controller : Validate USer Input()", 10);
                                    let apiResponse = Response.generate(true, "Email address is invalid or not exist", 500, null);
                                    reject(apiResponse);
                                }
                                else {
                                    resolve(req);
                                }
                            }
                        });
                    }
                }
                else {
                    Logger.Info("Please enter email address", "USer Controller : Validate user input()", 10);
                    let apiResponse = Response.generate(true, "Please enter email address", 500, null);
                    reject(apiResponse);
                }
            });
        }//end of email and password validation function

        //function to create user
        let CreateUser = () => {
            let findQuery = {
                $or: [
                    {
                        email: req.body.email
                    },
                    {
                        userName: req.body.userName
                    }
                ]
            }
            return new Promise((resolve, reject) => {
                UserModel.findOne(findQuery)
                    .exec((err, result) => {
                        if (err) {
                            Logger.error(err.message, "User Controller : Create USer()", 10);
                            let apiResponse = Response.generate(true, "Failed To create user", 500, null);
                            reject(apiResponse);
                        }
                        else if (Check.isEmpty(result)) {
                            let newUser = new UserModel({
                                userId: shortid.generate(),
                                userName: req.body.userName,
                                email: req.body.email,
                                password: passwordLib.hashPassword(req.body.password),
                                mobileNumber: req.body.mobileNumber,
                                country_code: req.body.country_code,
                                country_name: req.body.country_name,
                                createdOn: timeLib.now(),
                                socialPlatform: req.body.signup_with,
                                is_verified: false
                            });
                            newUser.save((err, newUser) => {
                                if (err) {
                                    Logger.error(err.message, "User Controller : Cretae USer()", 10);
                                    let apiResponse = Response.generate(true, "Failed To create USer", 500, null);
                                    reject(apiResponse);
                                }
                                else {
                                    let newUSerObj = newUser.toObject();
                                    resolve(newUSerObj);
                                }
                            });
                        }
                        else {
                            if (((result.email === req.body.email) && (result.userName === req.body.userName)) && (result.is_verified === false)) {
                                Logger.Info("This Username and Email is already registered into the system. You have to verify your account from registered email address.", "User Controller : Create USer()", 10);
                                let apiResponse = Response.generate(true, "This Username And Email is already registered into the system. You have to verify your account from registered email address.", 500, null);
                                reject(apiResponse);
                            }
                            else {
                                Logger.Info("Email Or Username is already exist", "User Controller : Create USer()", 10);
                                let apiResponse = Response.generate(true, "Email Or Username is already exist", 500, null);
                                reject(apiResponse);
                            }
                        }
                    });
            });
        }//end of create user function
        validateUserInput(req, res)
            .then(CreateUser)
            .then((resolve) => {
                delete resolve.password;
                const emailToken = jwt.sign(
                    {
                        email: resolve.email
                    }, 'secret', { expiresIn: '365d' }
                );
                var fromEmailAddress = 'namratafaldu21@gmail.com';
                var toEmailAddress = resolve.email;
                var mail = {
                    from: fromEmailAddress,
                    to: toEmailAddress,
                    subject: 'Action Required : Please verify your email address',
                    text: "Hello!",
                    html: EmailLibs.verify_email_mail_content(`http://localhost:4200/Verify-User/${emailToken}`)
                }
                transport.sendMail(mail, function (error, response) {
                    if (error) {
                        Logger.Info(error.message, "User Controller : Forgot pwd()", 10);
                        let apiResponse = Response.generate(true, error.message, 404, null);
                        res.send(apiResponse);
                    } else {
                        let apiResponse = Response.generate(false, "User registered Successfully and we have sent you confirmation link", 200, resolve);
                        res.send(apiResponse);
                    }
                    transport.close();
                });
            })
            .catch((err) => {
                console.log(err);
                res.send(err);
            });
    }
}//end of signup functionality

//check username function starts
let checkUsername = (req, res) => {
    if(req.body.userId)
    {
        var finQuery = { userName: req.body.userName, userId : {$ne : req.body.userId} }
    }
    else
    {
        var finQuery = { userName: req.body.userName}
    }
    UserModel.findOne(finQuery)
        .exec((err, result) => {
            if (err) {
                Logger.Info(err.message, "User Controller : check username()", 10);
                let apiResponse = Response.generate(true, err.message, 404, null);
                res.send(apiResponse);
            }
            else if (Check.isEmpty(result)) {
                let apiResponse = Response.generate(false, 'user Not Found', 404, null);
                res.send(apiResponse);
            }
            else {
                Logger.Info('Username is already exists', "User Controller : check username()", 10);
                let apiResponse = Response.generate(true, 'Username is already exists', 200, null);
                res.send(apiResponse);
            }
        })
}//end of check username function

//check email function starts
let checkEmail = (req, res) => {
    UserModel.findOne({ email: req.body.email })
        .exec((err, result) => {
            if (err) {
                Logger.Info(err.message, "User Controller : check email()", 10);
                let apiResponse = Response.generate(true, err.message, 404, null);
                res.send(apiResponse);
            }
            else if (Check.isEmpty(result)) {
                let apiResponse = Response.generate(false, 'email Not Found', 404, null);
                res.send(apiResponse);
            }
            else {
                Logger.Info('Email is already exists', "User Controller : check email()", 10);
                let apiResponse = Response.generate(true, 'Email is already exists', 200, null);
                res.send(apiResponse);
            }
        });
}// end of check email function

//strating of verify user function
let VerifyUser = (req, res) => {
    jwt.verify(req.body.Token, 'secret', (err, authData) => {
        if (err) {
            Logger.error(err.message, "User Controller:Verify User()", 10);
            let apiResponse = Response.generate(true, err.message, 500, null);
            res.send(apiResponse);
        }
        else {
            let options = { is_verified: true };
            UserModel.updateOne({ email: authData.email }, options)
                .exec((error, result) => {
                    if (error) {
                        Logger.error(error.message, "USer Controller : verify User()", 10);
                        let apiResponse = Response.generate(true, "Error Occured while verifying user", 500, null);
                        res.send(apiResponse);
                    }
                    else if (Check.isEmpty(result)) {
                        Logger.Info("User Not Found", "User Controller : Verify User()", 10);
                        let apiResponse = Response.generate(true, "User Not Found", 404, null);
                        res.send(apiResponse);
                    }
                    else {
                        let apiResponse = Response.generate(false, "User is verified successfully", 200, result);
                        res.send(apiResponse);
                    }
                });
            //res.send(authData);
        }
    });
}//end of verify user function

//forgot password function starts
let forgotpwd = (req, res) => {
    if (req.body.check_data) {
        let findQuery = {
            $or: [
                {
                    $and:
                        [
                            { email: req.body.check_data },
                            { is_verified: true }
                        ]
                },
                {
                    $and:
                        [
                            { userName: req.body.check_data },
                            { is_verified: true }
                        ]
                }
            ]
        }
        UserModel.findOne(findQuery)
            .exec((error, result) => {
                if (error) {
                    Logger.error(error.message, "User Controller : Forgot Pwd()", 10);
                    let apiResponse = Response.generate(true, "Error Occued", 500, null);
                    res.send(apiResponse)
                }
                else if (Check.isEmpty(result)) {
                    Logger.Info("You have not registered into the system Or not verified your account from your registered gmail account", "User Controller : Forgot pwd()", 10);
                    let apiResponse = Response.generate(true, "You have not registered into the system Or not verified your account from your registered gmail account", 404, null);
                    res.send(apiResponse);
                }
                else {
                    if (result.socialPlatform === 'facebook' || result.socialPlatform === 'google') {
                        Logger.Info(`You have registered into the system through your ${result.socialPlatform} account. So you can not recover passsword from here.`, "User Controller : Forgot pwd()", 10);
                        let apiResponse = Response.generate(true, `You have registered into the system through your ${result.socialPlatform} account. So you can not recover passsword from here.`, 404, null);
                        res.send(apiResponse);
                    }
                    else {
                        const emailToken = jwt.sign(
                            {
                                email: result.email
                            }, 'secret', { expiresIn: '24h' }
                        );
                        var fromEmailAddress = 'plannermeeting65@gmail.com';
                        var toEmailAddress = result.email;
                        var encrypted_email = encrypt(result.email);
                        var mail = {
                            from: fromEmailAddress,
                            to: toEmailAddress,
                            subject: 'password Recovery Link',
                            text: "Hello!",
                            html: EmailLibs.passwordRecovery_Link_content(`http://localhost:4200/recover-password/${emailToken}`)
                        }
                        transport.sendMail(mail, function (error, response) {
                            if (error) {
                                Logger.Info(error.message, "User Controller : Forgot pwd()", 10);
                                let apiResponse = Response.generate(true, error.message, 404, null);
                                res.send(apiResponse);
                            } else {
                                let apiResponse = Response.generate(false, "WE have sent you passworrd recovery link to you email so please check your email account", 200, result);
                                res.send(apiResponse);
                            }
                            transport.close();
                        });
                    }
                }
            });
    }
    else {
        Logger.Info("Please enter email address Or Username", "user Controller : forgot pwd()", 10);
        let apiResponse = Response.generate(true, "Please enter email address or Username", 500, null);
        res.send(apiResponse);
    }
}//end of forgot password function

//get email address from token
let getEmail = (req, res) => {
    jwt.verify(req.body.Token, 'secret', (err, authData) => {
        if (err) {
            Logger.error(err.message, "User Controller:Verify User()", 10);
            let apiResponse = Response.generate(true, err.message, 500, null);
            res.send(apiResponse);
        }
        else {
            let apiResponse = Response.generate(true, "email Found", 200, authData);
            res.send(apiResponse)
        }
    });

}//end of get email function

//recover password function 
let RecoverPassword = (req, res) => {
    if (req.body.password) {
        if (!validateInput.Password(req.body.password)) {
            Logger.error("password does not met reequirements", "User Controller:Verify User()", 10);
            let apiResponse = Response.generate(true, "password does not met reequirements", 500, null);
            res.send(apiResponse);
        }
        else if (!validateInput.Email(req.body.email)) {
            Logger.error("User(email) Not Found", "User Controller:Verify User()", 10);
            let apiResponse = Response.generate(true, "User Not Found", 500, null);
            res.send(apiResponse);
        }
        else {
            let ch_email = req.body.email;
            let hashPassword_enc = passwordLib.hashPassword(req.body.password);
            let password_data = { password: hashPassword_enc }
            UserModel.findOneAndUpdate({ email: ch_email, is_verified: true }, password_data)
                .exec((err, result) => {
                    if (err) {
                        Logger.error(err.message, "User Controller:Verify User()", 10);
                        let apiResponse = Response.generate(true, err.message, 500, null);
                        res.send(apiResponse);
                    }
                    else if (Check.isEmpty(result)) {
                        Logger.error("User Not Found(empty) Or you have not verified your account from your registerd email id", "User Controller:Verify User()", 10);
                        let apiResponse = Response.generate(true, "User Not Found Or you have not verified your account from your registerd email id", 500, null);
                        res.send(apiResponse);
                    }
                    else {
                        let apiResponse = Response.generate(false, "Password changed successfully", 200, result);
                        res.send(apiResponse);
                    }
                })
        }
    }
    else {
        Logger.error("Please enter password", "User Controller:Verify User()", 10);
        let apiResponse = Response.generate(true, "please enter password", 500, null);
        res.send(apiResponse);
    }
}//end of recover password function

//starting of login function 
let Login = (req, res) => {

    console.log(req.body.signin_with);
    //if user sign in with facebook and google
    if (req.body.signin_with === 'facebook' || req.body.signin_with === 'google') {
        //function to find user who is sign up with facebook or gmail
        let findUser = (req, res) => {
            return new Promise((resolve, reject) => {
                if (req.body.email) {
                    UserModel.findOne({ userName: req.body.userName, socialPlatform: req.body.signin_with })
                        .lean()
                        .select('-__V -_id')
                        .exec((err, retrivedUserDetails) => {
                            if (err) {
                                Logger.error(err.message, "User Controller : Find User()", 10);
                                let apiResponse = Response.generate(true, "Failed to retrieve user details", 500, null);
                                reject(apiResponse);
                            }
                            else if (Check.isEmpty(retrivedUserDetails)) {
                                Logger.Info(`User Not Found and You have To First Register into the system by your ${req.body.signin_with} account.`, "USer Controller : Find User()", 10);
                                let apiResponse = Response.generate(true, `User Not Found and You have To First Register into the system by your ${req.body.signin_with} account.`, 404, null);
                                reject(apiResponse);
                            }
                            else {
                                resolve(retrivedUserDetails);
                            }
                        });
                }
                else {
                    Logger.Info("Please Enter Email address", "USer Controller : Find USer()", 10);
                    let apiResponse = Response.generate(true, "Please Enter Email address", 500, null);
                    reject(apiResponse);
                }
            });
        }//end of function for finding the user who is sign up with facebook or gmail

        //function to generate token who is sign in with facebook or google
        let generateToken = (userDEtails) => {
            return new Promise((resolve, reject) => {
                TokenLib.generateToken(userDEtails, (err, tokenDetails) => {
                    if (err) {
                        Logger.error(err.message, "USer Controller : generate Token()", 10);
                        let apiResponse = Response.generate(true, "Failed To Generate Token", 500, null);
                        reject(apiResponse);
                    }
                    else {
                        tokenDetails.userId = userDEtails.userId;
                        tokenDetails.userDetails = userDEtails;
                        resolve(tokenDetails);
                    }
                });
            });
        }//end of generate toke function who is sign up via fb or google

        //function to save particular token who is sign up via facebook or gmail
        let saveToken = (tokenDetails) => {
            return new Promise((resolve, reject) => {
                AuthModel.findOne({ userId: tokenDetails.userId })
                    .exec((err, retrievedDetails) => {
                        console.log("token details " + tokenDetails);
                        if (err) {
                            Logger.error(err.message, "User Controller : Save Token()", 10);
                            let apiResponse = Response.generate(true, "Failed To save Token", 500, null);
                            reject(apiResponse);
                        }
                        else if (Check.isEmpty(retrievedDetails)) {
                            let newToken_data = new AuthModel({
                                userId: tokenDetails.userId,
                                authToken: tokenDetails.token,
                                tokensecret: tokenDetails.tokensecret,
                                tokengenerationTime: timeLib.now()
                            });
                            newToken_data.save((err, newtokendeetails) => {
                                if (err) {
                                    logger.error(err.message, 'User controller : aveToken()', 10);
                                    let apiResponse = response.generate(tru, 'Failed To generate Token', 500, null);
                                    reject(apiResponse);
                                }
                                else {
                                    let responseBody = {
                                        authToken: newtokendeetails.authToken,
                                        userDetails: tokenDetails.userDetails
                                    }
                                    resolve(responseBody);
                                }
                            })
                        }
                        else {
                            retrievedDetails.authToken = tokenDetails.token;
                            retrievedDetails.tokensecret = tokenDetails.tokensecret;
                            retrievedDetails.tokengenerationTime = timeLib.now();
                            retrievedDetails.save((err, newTokenDetails) => {
                                if (err) {
                                    logger.error(err.message, 'User controller : saveToken()', 10);
                                    let apiResponse = response.generate(tru, 'Failed To generate Token', 500, null);
                                    reject(apiResponse);
                                }
                                else {
                                    let responseBody = {
                                        authToken: newTokenDetails.authToken,
                                        userDetails: tokenDetails.userDetails
                                    }
                                    resolve(responseBody);
                                }
                            });
                        }
                    });
            });
        }//end of save token funtion who is logged via facebook or gmail

        findUser(req, res)
            .then(generateToken)
            .then(saveToken)
            .then((resolve) => {
                console.log(resolve)
                let apiResponse = Response.generate(false, "Logged in successfully", 200, resolve);
                res.send(apiResponse);
            })
            .catch((err) => {
                console.log("error");
                res.send(err);
            });
    }
    else {
        //function to find user
        let findUser = (req, res) => {
            return new Promise((resolve, reject) => {
                if (req.body.userName) {
                    UserModel.findOne({ userName: req.body.userName })
                        .lean()
                        .select('-__V -_id')
                        .exec((err, retrivedUserDetails) => {
                            if (err) {
                                Logger.error(err.message, "User Controller : Find User()", 10);
                                let apiResponse = Response.generate(true, "Failed to retrieve user details", 500, null);
                                reject(apiResponse);
                            }
                            else if (Check.isEmpty(retrivedUserDetails)) {
                                Logger.Info("User Not Found", "USer Controller : Find User()", 10);
                                let apiResponse = Response.generate(true, "User Not Found", 404, null);
                                reject(apiResponse);
                            }
                            else {
                                if (retrivedUserDetails.is_verified === false) {
                                    Logger.Info("Please verify your Account First from your mail and then you will login into the system", "USer Controller : Find User()", 10);
                                    let apiResponse = Response.generate(true, "Please verify your Account First from your mail and then you will login into the system", 404, null);
                                    reject(apiResponse);
                                }
                                else {
                                    resolve(retrivedUserDetails);
                                }
                            }
                        });
                }
                else {
                    Logger.Info("Please Enter Username", "USer Controller : Find USer()", 10);
                    let apiResponse = Response.generate(true, "Please Enter Username", 500, null);
                    reject(apiResponse);
                }
            });
        }//end of function for finding the user

        //function to validate password
        let ValidatePwd = (userDetails) => {
            return new Promise((resolve, reject) => {
                passwordLib.ComparePassword(req.body.password, userDetails.password, (error, isMatch) => {
                    if (error) {
                        Logger.error(error.message, "User Controller : Compare PAssword()", 10);
                        let apiResponse = Response.generate(true, "Incorrect Password", 500, null);
                        reject(apiResponse);
                    }
                    else if (isMatch) {
                        let userDetailsobj = userDetails;
                        delete userDetailsobj.password;
                        delete userDetailsobj.createdOn;
                        delete userDetailsobj.__v;
                        delete userDetailsobj._id;
                        resolve(userDetailsobj);
                    }
                    else {
                        Logger.Info("Invalid Password", "User Controller : Compare PAssword()", 10);
                        let apiResponse = Response.generate(true, "Invalid Password", 500, null);
                        reject(apiResponse);
                    }
                });
            });
        }//end of function for validating the password

        //function to generate token
        let generateToken = (userDEtails) => {
            return new Promise((resolve, reject) => {
                TokenLib.generateToken(userDEtails, (err, tokenDetails) => {
                    if (err) {
                        Logger.error(err.message, "USer Controller : generate Token()", 10);
                        let apiResponse = Response.generate(true, "Failed To Generate Token", 500, null);
                        reject(apiResponse);
                    }
                    else {
                        tokenDetails.userId = userDEtails.userId;
                        tokenDetails.userDetails = userDEtails;
                        resolve(tokenDetails);
                    }
                });
            });
        }//end of generate toke function

        //function to save particular token
        let saveToken = (tokenDetails) => {
            return new Promise((resolve, reject) => {
                AuthModel.findOne({ userId: tokenDetails.userId })
                    .exec((err, retrievedDetails) => {
                        console.log("token details " + tokenDetails);
                        if (err) {
                            Logger.error(err.message, "User Controller : Save Token()", 10);
                            let apiResponse = Response.generate(true, "Failed To save Token", 500, null);
                            reject(apiResponse);
                        }
                        else if (Check.isEmpty(retrievedDetails)) {
                            let newToken_data = new AuthModel({
                                userId: tokenDetails.userId,
                                authToken: tokenDetails.token,
                                tokensecret: tokenDetails.tokensecret,
                                tokengenerationTime: timeLib.now()
                            });
                            newToken_data.save((err, newtokendeetails) => {
                                if (err) {
                                    logger.error(err.message, 'User controller : aveToken()', 10);
                                    let apiResponse = response.generate(tru, 'Failed To generate Token', 500, null);
                                    reject(apiResponse);
                                }
                                else {
                                    let responseBody = {
                                        authToken: newtokendeetails.authToken,
                                        userDetails: tokenDetails.userDetails
                                    }
                                    resolve(responseBody);
                                }
                            })
                        }
                        else {
                            retrievedDetails.authToken = tokenDetails.token;
                            retrievedDetails.tokensecret = tokenDetails.tokensecret;
                            retrievedDetails.tokengenerationTime = timeLib.now();
                            retrievedDetails.save((err, newTokenDetails) => {
                                if (err) {
                                    logger.error(err.message, 'User controller : saveToken()', 10);
                                    let apiResponse = response.generate(tru, 'Failed To generate Token', 500, null);
                                    reject(apiResponse);
                                }
                                else {
                                    let responseBody = {
                                        authToken: newTokenDetails.authToken,
                                        userDetails: tokenDetails.userDetails
                                    }
                                    resolve(responseBody);
                                }
                            });
                        }
                    });
            });
        }//end of save token funtion

        findUser(req, res)
            .then(ValidatePwd)
            .then(generateToken)
            .then(saveToken)
            .then((resolve) => {
                console.log(resolve)
                let apiResponse = Response.generate(false, "Logged in successfully", 200, resolve);
                res.send(apiResponse);
            })
            .catch((err) => {
                console.log("error");
                res.send(err);
            });
    }
}//end of login function

//fuction to logout user
let Logout = (req,res) => {
    AuthModel.findOneAndRemove({userId:req.body.userId})
    .exec((err,result) => {
        if(err)
        {
            Logger.error(err.message,"User Controller : Logout()",10);
            let apiResponse = Response.generate(true,"Failed to fetch authtoken",500,null);
            res.send(apiResponse);
        }
        else if(Check.isEmpty(result))
        {
            Logger.Info("Invalid User OR Already Logged Out","USer Controller : Logout()",10);
            let apiResponse = Response.generate(true,"Invalid USer Or Already Logged Out",404,null);
            res.send(apiResponse);
        }
        else
        {
            let apiResponse = Response.generate(false,"User Logged Out Successfully",200,result);
            res.send(apiResponse);
        }
    });
}//end of logout function

//start of function to get single user information
let GetSingleUserInfo = (req,res) => {
    UserModel.findOne({userId:req.body.userId})
    .exec((err,result) => {
        if(err)
        {   
            Logger.error(err.message,"User Controller : get single user info()",10);
            let apiResponse = Response.generate(true,err.message,500,null);
            res.send(apiResponse);
        }
        else if(Check.isEmpty(result))
        {
            Logger.Info("No User Found","User Controller : get single user info()",10);
            let apiResponse = Response.generate(true,"No User Found",404,null);
            res.send(apiResponse);
        }
        else
        {
            console.log(result); 
            let apiResponse = Response.generate(false,"User Information Listed",200,result);
            res.send(apiResponse);
        }
    })
}//end of function to get single user information

//start of function to edit user profile
let editProfile = (req,res) => {
    if(req.body.email)
    {
        if(!validateInput.Email(req.body.email))
        {
            Logger.Info("Incorrect Email Address","User Contoller : Validate USer Input()",10);
            let apiResponse = Response.generate(true,"Incorrect email",500,null);
            res.send(apiResponse);
        }
        else
        {
            let options = req.body;
            UserModel.updateOne({userId : req.params.userId}, req.body)
            .exec((err, result) => {
                if(err)
                {
                    Logger.error(err.message,"USer Controller : UpdateUSer()",10);
                    let apiResponse = Response.generate(true,"Failed To Edit USer Profile",500,null);
                    res.send(apiResponse);
                }
                else if(Check.isEmpty(result))
                {
                    Logger.Info("No User Found","USer Controller : UpdateUser()",10);
                    let apiResponse = Response.generate(true,"No User Found",404,null);
                    res.send(apiResponse);
                }
                else
                {
                    let apiResponse = Response.generate(false,"User Details Updated Successfully",200,result);
                    res.send(apiResponse);
                }
            });
        }   
    }
    else
    {
        let options = req.body;
        UserModel.updateOne({userId : req.params.userId}, req.body)
        .exec((err, result) => {
            if(err)
            {
                Logger.error(err.message,"USer Controller : UpdateUSer()",10);
                let apiResponse = Response.generate(true,"Failed To Edit USer Profile",500,null);
                res.send(apiResponse);
            }
            else if(Check.isEmpty(result))
            {
                Logger.Info("No User Found","USer Controller : UpdateUser()",10);
                let apiResponse = Response.generate(true,"No User Found",404,null);
                res.send(apiResponse);
            }
            else
            {
                let apiResponse = Response.generate(false,"User Details Updated Successfully",200,result);
                res.send(apiResponse);
            }
        });
    }
}//end of edit profile function


//function to change password
let ChangePwd = (req,res) => {
    let Get_user_data = (req,res) => {
        return new Promise((resolve, reject) => {
            console.log("userId  :" + req.body.userId);
            UserModel.findOne({userId : req.body.userId})
            .exec((err, retrivedUserDetails) => {
                if(err)
                {
                    Logger.error(err.message,"User Controller : change password()",10);
                    let apiResponse = Response.generate(false,err.message,500,null);
                    reject(apiResponse);
                }
                else if(Check.isEmpty(retrivedUserDetails))
                {
                    Logger.Info("User Not Found()","User Controller : change password()",10);
                    let apiResponse = Response.generate(false,"Useer Not Found",404,null);
                    reject(apiResponse);
                }
                else
                {
                    resolve(retrivedUserDetails);
                }
            });
        });
    }

    //function to validate password
    let ValidatePwd = (userDetails) => {
        return new Promise((resolve, reject) => {
            passwordLib.ComparePassword(req.body.old_password, userDetails.password, (error, isMatch) => {
                if(error)
                {
                    console.log("if");
                    Logger.error(error.message,"User Controller : Chnage PAssword()",10);
                    let apiResponse = Response.generate(true,"Incorrect Password",500,null);
                    reject(apiResponse);
                }
                else if(isMatch)
                {
                    if(!validateInput.Password(req.body.new_password))
                    {
                        Logger.Info("Password Does Not met Requirements","USer Controller : Change Passowrd()",10);
                        let apiResponse = Response.generate(true,"Password does not met requirement",500,null);
                        reject(apiResponse);
                    }
                    else
                    {
                        let new_password = passwordLib.hashPassword(req.body.new_password);
                        let n_pwd = { password : new_password};
                        console.log("new Password : " + new_password)
                        UserModel.findOneAndUpdate({userId : userDetails.userId},n_pwd)
                        .exec((error, result) => {

                            if(error)
                            {
                                Logger.error(error.message,"User Controller : change password()",10);
                                let apiResponse = response.generate(false,error.message,500,null);
                                reject(apiResponse);
                            }
                            else if(Check.isEmpty(result))
                            {
                                Logger.Info("USer Not Found","User Controller : Change Password()",10);
                                let apiResponse = Response.generate(true,"User Not Found",404,null);
                                reject(apiResponse);
                            }
                            else
                            {
                                resolve(result);
                            }
                        });
                    }
                }
                else 
                {
                    console.log("else");
                    Logger.Info("You have inputed wrong password","User Controller : Compare PAssword()",10);
                    let apiResponse = Response.generate(true,"You have inputed wrong password",500,null);
                    reject(apiResponse);
                }
            });
        });
    }

    Get_user_data(req,res)
    .then(ValidatePwd)
    .then((resolve) => {
            let apiResponse = Response.generate(false,"Password Changed Successfully",200,resolve);
            res.send(apiResponse);
    })
    .catch((err) => {
        console.log(err);
        res.send(err);
    })
}//end of change password function

module.exports = {
    getallUser:getallUser,
    SignUp: SignUp,
    checkUsername: checkUsername,
    checkEmail: checkEmail,
    VerifyUser: VerifyUser,
    forgotpwd: forgotpwd,
    getEmail: getEmail,
    RecoverPassword: RecoverPassword,
    Login: Login,
    Logout:Logout,
    GetSingleUserInfo:GetSingleUserInfo,
    editProfile:editProfile,
    ChangePwd:ChangePwd
}