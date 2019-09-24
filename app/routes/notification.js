const express = require('express');
const router = express.Router();
const app = express();
const appConfig = require('./../../config/config');
const NotificationController = require('../controllers/NotificationController');
module.exports.setRouter = (app) => {
    let baseUrl = `${appConfig.apiVersion}/Notifications`;
    app.get(`${baseUrl}/get-all-notification`,NotificationController.get_all_notifications)
}