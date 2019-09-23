const express = require('express');
const router = express.Router();
const app = express();
const appConfig = require('./../../config/config');
const IssueController = require('./../controllers/issueController');
module.exports.setRouter = (app) => {
    let baseUrl = `${appConfig.apiVersion}/Issues`;
    app.post(`${baseUrl}/Perticular-User-assigned-issues`,IssueController.particular_user_assigned_issue),
    app.post(`${baseUrl}/issues-created-by-logged-in-user`,IssueController.particular_user_created_issues),
    app.get(`${baseUrl}/get-all-issues`,IssueController.get_all_issues),
    app.get(`${baseUrl}/done-issues`,IssueController.all_done_issues),
    app.get(`${baseUrl}/all-open-issues`,IssueController.all_open_issues),
    app.post(`${baseUrl}/issue-information`,IssueController.particular_issue_information)
}