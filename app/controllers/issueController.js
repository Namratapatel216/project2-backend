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
const IssueModel = mongoose.model('Issue');

//start function to get all the issues assigned to particular user
let particular_user_assigned_issue = (req,res) => {
    IssueModel.find({issue_assignee : req.body.logged_in_user_id})
    .exec((err,result) => {
        if(err)
        {
            Logger.error(err.message,"Issue Controller : issue assigned particular user()",10);
            let apiresponse = Response.generate(true,error.message,500,null);
            res.send(apiresponse);
        }
        else if(Check.isEmpty(result))
        {
            Logger.Info("issue is not assigned to particular user","Issue Controller : issue assigned particular user()",10);
            let apiresponse = Response.generate(true,"issue is not assigned to particular user",404,null);
            res.send(apiresponse);
        }
        else
        {
            let apiresponse = Response.generate(false,"Issue Listed",200,result);
            res.send(apiresponse);
        }
    })

}//end of get all the issues assigned to particular user

//start function of all the issues reported by particular logged in user
let particular_user_created_issues = (req,res) => {
    IssueModel.find({issue_reporter : req.body.issue_reporter_id, issue_status : { $ne: 'done' }})
    .exec((err,result) => {
        if(err)
        {
            Logger.error(err.message,"Issue Controller : issue reported by particular user()",10);
            let apiresponse = Response.generate(true,error.message,500,null);
            res.send(apiresponse);
        }
        else if(Check.isEmpty(result))
        {
            Logger.Info("issue is not reported by particular user","Issue Controller : issue reported by particular user()",10);
            let apiresponse = Response.generate(true,"issue is not reported by particular user",404,null);
            res.send(apiresponse);
        }
        else
        {
            let apiresponse = Response.generate(false,"Issue Reported by Logged in user is Listed here",200,result);
            res.send(apiresponse);
        }
    });
}
//end of function to get all the issues reported by particuler logged in user

//start of function to get all issues
let get_all_issues = (req,res) => {
    IssueModel.find()
    .exec((err,result) => {
        if(err)
        {
            Logger.error(err.message,"Issue Controller : get all issues()",10);
            let apiresponse = Response.generate(true,error.message,500,null);
            res.send(apiresponse);
        }
        else if(Check.isEmpty(result))
        {
            Logger.Info("issue not Found","Issue Controller : get all issues()",10);
            let apiresponse = Response.generate(true,"Issue Not Found",404,null);
            res.send(apiresponse);
        }
        else
        {
            let apiresponse = Response.generate(false,"Issue Listed",200,result);
            res.send(apiresponse);
        }
    });
}
//end of get all issues function

//function to get done issues 
let all_done_issues = (req,res) => {
    IssueModel.find({issue_status : 'done' })
    .exec((err,result) => {
        if(err)
        {
            Logger.error(err.message,"Issue Controller : done issues ()",10);
            let apiresponse = Response.generate(true,error.message,500,null);
            res.send(apiresponse);
        }
        else if(Check.isEmpty(result))
        {
            Logger.Info("No Done Issues Found ","Issue Controller : done issues ()",10);
            let apiresponse = Response.generate(true,"No Done Issues Found ",404,null);
            res.send(apiresponse);
        }
        else
        {
            let apiresponse = Response.generate(false,"All Done Issues are Listed",200,result);
            res.send(apiresponse);
        }
    });
}//end of function to get done issues 

//function to get all open issues
let all_open_issues = (req,res) => {
    IssueModel.find({issue_status : { $ne: 'done' } })
    .exec((err,result) => {
        if(err)
        {
            Logger.error(err.message,"Issue Controller : Open issues ()",10);
            let apiresponse = Response.generate(true,error.message,500,null);
            res.send(apiresponse);
        }
        else if(Check.isEmpty(result))
        {
            Logger.Info("No open Issues Found ","Issue Controller : open issues ()",10);
            let apiresponse = Response.generate(true,"No open Issues Found ",404,null);
            res.send(apiresponse);
        }
        else
        {
            let apiresponse = Response.generate(false,"All open Issues are Listed",200,result);
            res.send(apiresponse);
        }
    });
}//end of function to get all open issues

//start of function to get all information about issue
let particular_issue_information = (req,res) => {
    IssueModel.findOne({issueId : req.body.issue_id})
    .exec((err,result) => {
        if(err)
        {
            Logger.error(err.message,"Issue Controller : Issue Info()",10);
            let apiresponse = Response.generate(true,err.message,500,null);
            res.send(apiresponse);
        }
        else if(Check.isEmpty(result))
        {
            Logger.Info("Issue Not Found","Issue Controller : Issue Info()",10);
            let apiresponse = Response.generate(true,"Issue Not Found",404,null);
            res.send(apiresponse);
        }
        else
        {
            let apiresponse = Response.generate(false,"All information of particular issue is listed",200,result);
            res.send(apiresponse);
        }
    });
}//end of function to get all information about issue

module.exports = {
    particular_user_assigned_issue:particular_user_assigned_issue,
    particular_user_created_issues:particular_user_created_issues,
    get_all_issues:get_all_issues,
    all_done_issues:all_done_issues,
    all_open_issues:all_open_issues,
    particular_issue_information:particular_issue_information
}