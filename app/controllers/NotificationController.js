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
const NotificationModel = mongoose.model('Notification');

//function to get all notification
let get_all_notifications = (req,res) => {
    NotificationModel.find()
    .exec((err,result) => {
        if(err)
        {
            Logger.error(err.message,"Notofication controller : get all notification()",10);
            let apiResponse = Response.generate(true,err.message,500,null);
            res.send(apiResponse);
        }
        else if(Check.isEmpty(result))
        {
            Logger.Info("No Notification Found","Notofication controller : get all notification()",10);
            let apiResponse = Response.generate(true,"No Notification Found",404,null);
            res.send(apiResponse);
        }
        else
        {
            result.reverse();
            let apiResponse = Response.generate(false,"Notification Listed",200,result);
            res.send(apiResponse);
        }
    })
}

module.exports = {
    get_all_notifications:get_all_notifications
}