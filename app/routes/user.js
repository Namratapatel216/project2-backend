const express = require('express');

const router = express.Router();

const app = express();

const appConfig = require('./../../config/config');

const userController = require('./../controllers/userController');

module.exports.setRouter = (app) => {
    let baseUrl = `${appConfig.apiVersion}/users`;

    app.get(`${baseUrl}/getallUser`,userController.getallUser),
    app.get(`${baseUrl}/view/all`,userController.getallUser),
    app.post(`${baseUrl}/signUp`,userController.SignUp),
    app.post(`${baseUrl}/check_user`,userController.checkUsername),
    app.post(`${baseUrl}/check_email`,userController.checkEmail),
    app.post(`${baseUrl}/Verify-User`,userController.VerifyUser),
    app.post(`${baseUrl}/forgot-password`,userController.forgotpwd),
    app.post(`${baseUrl}/get-email`,userController.getEmail),
    app.post(`${baseUrl}/recover-password`,userController.RecoverPassword),
    app.post(`${baseUrl}/login`,userController.Login),
    app.post(`${baseUrl}/logOut`,userController.Logout),
    app.post(`${baseUrl}/Single-User-Info`,userController.GetSingleUserInfo),
    app.put(`${baseUrl}/:userId/edit-profile`,userController.editProfile),
    app.post(`${baseUrl}/change-password`,userController.ChangePwd)
}