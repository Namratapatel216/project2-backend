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
const commentModel = mongoose.model('comment');

//function to get comments of particular issue
let Get_Comments = (req,res) => {
    commentModel.find({issueId : req.body.issueId})
    .exec((err,result) => {
        if(err)
        {
            Logger.error(err.message,"Comments Controller : Get Comment()",10);
            let apiresponse = Response.generate(true,err.message,500,null);
            res.send(apiresponse);
        }
        else if(Check.isEmpty(result))
        {
            Logger.Info("No Comments Found For PArticular Issue","Comments Controller : Get Comment()",10);
            let apiresponse = Response.generate(true,"No Comments Found For PArticular Issue",404,null);
            res.send(apiresponse);
        }   
        else
        {
            let apiresponse = Response.generate(false,"All Comments Listed",200,result);
            res.send(apiresponse);
        }
    })
}//end of get comments function

module.exports = {
    Get_Comments : Get_Comments
}