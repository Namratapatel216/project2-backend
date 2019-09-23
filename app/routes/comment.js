const express = require('express');
const router = express.Router();
const app = express();
const appConfig = require('./../../config/config');
const commentController = require('./../controllers/commentController');
module.exports.setRouter = (app) => {
    let baseUrl = `${appConfig.apiVersion}/Comments`;
    app.post(`${baseUrl}/get-comments-of-particular-issue`,commentController.Get_Comments)
}