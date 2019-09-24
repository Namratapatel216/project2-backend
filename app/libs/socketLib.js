const socketio = require('socket.io');
const mongoose = require('mongoose');
const shortid = require('shortid');
const logger = require('./loggerLibs');
const events = require('events');
const eventEmitter = new events.EventEmitter();
const tokenLib = require('./tokenLibs');
const check = require('./checkLibs');
const response = require('./responseLibs');
const timeLib = require('./timeLibs');
const issueModel = mongoose.model('Issue');
const fs = require('fs');
const dropboxV2Api = require('dropbox-v2-api');
const commentModel = mongoose.model('comment');
const NotificationModel = mongoose.model('Notification');
var request = require('request');

// function to create file from base64 encoded string
function base64_decode(base64str, file) {
    var bitmap = new Buffer(base64str, 'base64');
    fs.writeFileSync(file, bitmap);
}

let setServer = (server) => {
    let io = socketio.listen(server);
    let myio = io.of('/');
    let allOnlineUsers = [];
    let data = "";

    myio.on('connection', (socket) => {

        socket.emit("VerifyUser", "");

        socket.on('set-User', (authToken) => {
            console.log("set user is called");
            tokenLib.verifyClaimwithoutSecret(authToken, (err, data) => {
                if (err) {
                    console.log("err");
                    socket.emit('auth-error', { status: 500, error: 'Please provide correct auth token' });
                }
                else {
                    let CurrentUser = data.data;
                    socket.userId = CurrentUser.userId;
                    let fullname = `${CurrentUser.userName}`;
                    let userObj = { userId: CurrentUser.userId, fullname: fullname };
                    allOnlineUsers.push(userObj);
                }
                console.log(allOnlineUsers);
            });
            //myio.emit('online-user-list',allOnlineUsers);
            socket.join('edchat');
            socket.to('edchat').broadcast.emit('online-user-list', allOnlineUsers);
        }); // end of set user function 

        myio.emit('online-user-list', allOnlineUsers);

        //create issue function is strated
        socket.on('create-issue', (data) => {
            console.log("create - issue is ccalled")
            data['issueId'] = shortid.generate();
            data['notificationId'] = shortid.generate();
            data['notificationTitle'] = `${data.issue_reporter_name} Created Issue ${data.issue_title}`;
            data['Notification_issue_id'] = data.issueId;
            data['notification_occurs'] = 'creation';
            data['notitification_issue_reporter'] = data['issue_reporter'];
            data['notification_issue_assignee'] = data['issue_assignee'];
            data['notification_issue_watchers'] = ',';
            if (data['issue_attachment_path'] === undefined || data['issue_attachment_path'] === null || data['issue_attachment_path'] === '') {
                data['check_for_what'] = "issue_creation"
                setTimeout(function () {
                    eventEmitter.emit('save-issue', data);
                }, 2000);
                socket.to('edchat').broadcast.emit('send-all-async-issues', data);
                myio.emit(data.issue_reporter, data);
            }
            else {
                var base64result = data['issue_attachment_path'].substr(data['issue_attachment_path'].indexOf(',') + 1);
                var image_path = base64_decode(base64result, data['issue_attachment_name']);
                data['check_for_what'] = "issue_creation";
                var access_token = "8OFJNocMFEAAAAAAAAAAWEuCMWkPSlal0hUm57GdKkJCmW0uRH09u0YZykmztpOU";
                //Name of the file to be uploaded
                var filename = data['issue_attachment_name'];
                var content =  fs.createReadStream(data['issue_attachment_name']);
                options = {
                    method: "POST",
                    url: 'https://content.dropboxapi.com/2/files/upload',
                    headers: {
                      "Content-Type": "application/octet-stream",
                      "Authorization": "Bearer " + access_token,
                      "Dropbox-API-Arg": "{\"path\": \"/YOUR_PATH_TO_FOLDER/"+filename+"\",\"mode\": \"overwrite\",\"autorename\": true,\"mute\": false}",
                    },
                    body:content
                };

                request(options,function(err, res,body){
                    console.log("Err : " + err);
                    console.log("res : " + res);
                    console.log("body : " + body);    
                });
                /* const dropbox = dropboxV2Api.authenticate({
                    token: '8OFJNocMFEAAAAAAAAAAWEuCMWkPSlal0hUm57GdKkJCmW0uRH09u0YZykmztpOU'
                });
                dropbox({
                    resource: 'files/upload',
                    parameters: {
                        path: `/edwisor data/${data['issue_attachment_name']}`
                    },
                    readStream: fs.createReadStream(data['issue_attachment_name'])
                }, (err, result, response) => {
                    console.log("result = " + JSON.stringify(result));
                    console.log("response = " + JSON.stringify(response));
                    if (response.statusCode === 200) {
                        data['issue_attachments'] = result.path_display;
                        data['dropbox_id'] = result.id;
                        setTimeout(function () {
                            eventEmitter.emit('save-issue', data);
                        }, 2000);
                        fs.unlink(data['issue_attachment_name'], (err) => {
                            if (err) {
                                console.error(err)
                                return
                            }
                        });
                        data['issue_attachment_path'] = '';
                        //myio.emit(data.issue_assignee,data);
                        //io.sockets.emit('create-issue', 'data');
                        //socket.to('edchat').broadcast.emit('create-issue',data);
                        //io.sockets.in('edchat').emit('send-all-async-issue', data);
                        socket.to('edchat').broadcast.emit('send-all-async-issues', data);
                        myio.emit(data.issue_reporter, data);
                    }
                }); */
            }
        });//end of create issue function

        socket.emit('send-all-async-issues', data);

        socket.on('update-attachment', (data) => {
            var base64result = data['issue_attachment_path'].substr(data['issue_attachment_path'].indexOf(',') + 1);
            var image_path = base64_decode(base64result, data['issue_attachment_name']);
            data['check_for_what'] = "attachment_updated";
            const dropbox = dropboxV2Api.authenticate({
                token: '8OFJNocMFEAAAAAAAAAAWEuCMWkPSlal0hUm57GdKkJCmW0uRH09u0YZykmztpOU'
            });
            dropbox({
                resource: 'files/upload',
                parameters: {
                    path: `/edwisor data/${data['issue_attachment_name']}`
                },
                readStream: fs.createReadStream(data['issue_attachment_name'])
            }, (err, result, response) => {
                console.log("result = " + JSON.stringify(result));
                console.log("response = " + JSON.stringify(response));
                if (response.statusCode === 200) {
                    data['issue_attachments'] = result.path_display;
                    data['dropbox_id'] = result.id;
                    setTimeout(function () {
                        eventEmitter.emit('save-updated-attcahment', data);
                        myio.emit(data['issueId'], data);
                    }, 2000);
                    fs.unlink(data['issue_attachment_name'], (err) => {
                        if (err) {
                            console.error(err)
                            return
                        }
                    });
                    myio.emit(data['issueId'], data);
                }
            });
        })

        socket.on('mark-chat-as-seen', (userDetails) => {
            console.log('mark chat seen is cALLES');
            setTimeout(function () {
                eventEmitter.emit('mark-chat-seen', userDetails);
            }, 2000);
        });

        socket.on('update_title', (titleDetails) => {
            titleDetails['notificationId'] = shortid.generate();
            titleDetails['notificationTitle'] = `${titleDetails.updated_by} Updated Issue Title ${titleDetails.new_issue_title}`;
            titleDetails['Notification_issue_id'] = titleDetails.issue_id;
            titleDetails['notification_occurs'] = 'updation';
            titleDetails['notitification_issue_reporter'] = titleDetails['issue_reporter'];
            titleDetails['notification_issue_assignee'] = titleDetails['issue_assignee'];
            titleDetails['notification_issue_watchers'] = titleDetails['issue_watchers'];
            titleDetails['check_for_what'] = "title_updated";

            setTimeout(function () {
                eventEmitter.emit('update-title', titleDetails);
            });
            myio.emit(titleDetails['issue_id'], titleDetails);
            socket.to('edchat').broadcast.emit('send-all-async-issues', titleDetails);
        });

        socket.on('update_description', (descriptionDetails) => {
            descriptionDetails['notificationId'] = shortid.generate();
            descriptionDetails['notificationTitle'] = `${descriptionDetails.updated_by} Updated Description of ${descriptionDetails.issue_title}`;
            descriptionDetails['Notification_issue_id'] = descriptionDetails.issue_id;
            descriptionDetails['notification_occurs'] = 'updation';
            descriptionDetails['notitification_issue_reporter'] = descriptionDetails['issue_reporter'];
            descriptionDetails['notification_issue_assignee'] = descriptionDetails['issue_assignee'];
            descriptionDetails['notification_issue_watchers'] = descriptionDetails['issue_watchers'];
            console.log("updated description is called")
            descriptionDetails['check_for_what'] = "description_updated";
            setTimeout(function () {
                eventEmitter.emit('update-description', descriptionDetails);
            });
            myio.emit(descriptionDetails['issue_id'], descriptionDetails);
            socket.to('edchat').broadcast.emit('send-all-async-issues', descriptionDetails);
        })

        socket.on('update-assignee', (assigneeDetails) => {
            assigneeDetails['notificationId'] = shortid.generate();
            assigneeDetails['notificationTitle'] = `${assigneeDetails.updated_by} Updated Assignee of ${assigneeDetails.issue_title}`;
            assigneeDetails['Notification_issue_id'] = assigneeDetails.issueId;
            assigneeDetails['notification_occurs'] = 'updation';
            assigneeDetails['notitification_issue_reporter'] = assigneeDetails['issue_reporter'];
            assigneeDetails['notification_issue_assignee'] = assigneeDetails['issue_assignee'];
            assigneeDetails['notification_issue_watchers'] = `${assigneeDetails['issue_watchers']},${assigneeDetails['updated_assignee_id']}`;
            assigneeDetails['check_for_what'] = "assignee_updated";
            setTimeout(function () {
                eventEmitter.emit('update-Assignee', assigneeDetails);
            });
            myio.emit(assigneeDetails['issueId'], assigneeDetails);
            socket.to('edchat').broadcast.emit('send-all-async-issues', assigneeDetails);
        });

        socket.on('update-reporter', (reporterDetails) => {
            reporterDetails['notificationId'] = shortid.generate();
            reporterDetails['notificationTitle'] = `${reporterDetails.updated_by} Updated Reporter of ${reporterDetails.issue_title}`;
            reporterDetails['Notification_issue_id'] = reporterDetails.issueId;
            reporterDetails['notification_occurs'] = 'updation';
            reporterDetails['notitification_issue_reporter'] = reporterDetails['issue_reporter'];
            reporterDetails['notification_issue_assignee'] = reporterDetails['issue_assignee'];
            reporterDetails['notification_issue_watchers'] = `${reporterDetails['issue_watchers']},${reporterDetails['updated_reporter_id']}`;
            console.log("updated reporter is called")
            reporterDetails['check_for_what'] = "reporter_updated";
            setTimeout(function () {
                eventEmitter.emit('update-Reporter', reporterDetails);
            });
            myio.emit(reporterDetails['issueId'], reporterDetails);
            socket.to('edchat').broadcast.emit('send-all-async-issues', reporterDetails);
        });

        socket.on('update-issue-status', (statusDetails) => {
            statusDetails['notificationId'] = shortid.generate();
            statusDetails['notificationTitle'] = `${statusDetails.updated_by} Updated Status of ${statusDetails.issue_title}`;
            statusDetails['Notification_issue_id'] = statusDetails.issueId;
            statusDetails['notification_occurs'] = 'updation';
            statusDetails['notitification_issue_reporter'] = statusDetails['issue_reporter'];
            statusDetails['notification_issue_assignee'] = statusDetails['issue_assignee'];
            statusDetails['notification_issue_watchers'] = `${statusDetails['issue_watchers']}`;
            console.log("updated issue status is called")
            statusDetails['check_for_what'] = "status_updated";
            setTimeout(function () {
                eventEmitter.emit('update_issue_status', statusDetails);
            });
            myio.emit(statusDetails['issueId'], statusDetails);
            socket.to('edchat').broadcast.emit('send-all-async-issues', statusDetails);
        });

        socket.on('add-comment', (commentDetails) => {
            commentDetails['notificationId'] = shortid.generate();
            commentDetails['notificationTitle'] = `${commentDetails.updated_by} Commented On ${commentDetails.issue_title}`;
            commentDetails['Notification_issue_id'] = commentDetails.issueId;
            commentDetails['notification_occurs'] = 'updation';
            commentDetails['notitification_issue_reporter'] = commentDetails['issue_reporter'];
            commentDetails['notification_issue_assignee'] = commentDetails['issue_assignee'];
            commentDetails['notification_issue_watchers'] = `${commentDetails['issue_watchers']}`;
            console.log("add comment is called");
            commentDetails['check_for_what'] = "comment_added";
            commentDetails['commentId'] = shortid.generate();
            setTimeout(function () {
                eventEmitter.emit('save-comment', commentDetails);
            });
            myio.emit(commentDetails['issueId'], commentDetails);
        });

        socket.on('add-watcher', (data) => {
            data['check_for_what'] = "watchers_updated";
            setTimeout(function () {
                eventEmitter.emit('add_watcher', data);
            });
            myio.emit(data['issueId'], data);
        });

        socket.on('update-notification',(data) => {
            data['check_for_what'] = "Notification_updated";
            setTimeout(function () {
                eventEmitter.emit('Update-Notification', data);
            });
            socket.to('edchat').broadcast.emit('send-all-async-issues', data);
        });

        socket.on('disconnect', () => {
            console.log("user is disconnected");
            console.log(socket.userId);
            var removeIndex = allOnlineUsers.map(function (user) { return user.userId; }).indexOf(socket.userId);
            allOnlineUsers.splice(removeIndex, 1)
            console.log(allOnlineUsers);
            //myio.emit('online-user-list',allOnlineUsers);
            socket.to('edchat').broadcast.emit('online-user-list', allOnlineUsers);
            socket.leave('edchat')
        }) // end of on disconnect 

    });
}

eventEmitter.on('save-issue', (issueDetails) => {
    let newIssue = new issueModel({
        issueId: issueDetails.issueId,
        issue_title: issueDetails.issue_title,
        issue_status: issueDetails.issue_status,
        issue_reporter: issueDetails.issue_reporter,
        issue_reporter_name: issueDetails.issue_reporter_name,
        issue_description: issueDetails.issue_description,
        issue_attachments: issueDetails.issue_attachments,
        issue_assignee: issueDetails.issue_assignee,
        issue_assignee_name: issueDetails.issue_assignee_name,
        issue_posted_date: issueDetails.issue_posted_date,
        dropbox_id: issueDetails.dropbox_id
    });
    newIssue.save((err, result) => {
        if (err) {
            console.log(`error occured ${err}`);
        }
        else if (check.isEmpty(result)) {
            console.log('issue is not saved');
        }
        else {
            console.log('issue saved');
            console.log(result);
            let notificationData = new NotificationModel({
                notificationId : issueDetails['notificationId'],
                notificationTitle : issueDetails['notificationTitle'],
                Notification_issue_id :issueDetails['issueId'],
                notification_occurs : 'creation',
                notitification_issue_reporter : issueDetails['issue_reporter'],
                notification_issue_assignee : issueDetails['issue_assignee'],
                notification_issue_watchers : ','
            })
            notificationData.save((err,result) => {
                if (err) {
                    console.log(`error occured ${err}`);
                }
                else if (check.isEmpty(result)) {
                    console.log('notification is not saved');
                }
                else
                {
                    console.log('notification saved');
                }
            })
        }
    });
});

eventEmitter.on('update-title', (titleDetails) => {
    issueModel.updateOne({ issueId: titleDetails.issue_id }, { issue_title: titleDetails.new_issue_title })
        .exec((err, result) => {
            if (err) {
                console.log(err);
            }
            else if (check.isEmpty(result)) {
                console.log("no issue found");
            }
            else {
                console.log("issue title is updated");
                let notificationData = new NotificationModel({
                    notificationId : titleDetails['notificationId'],
                    notificationTitle : titleDetails['notificationTitle'],
                    Notification_issue_id :titleDetails['Notification_issue_id'],
                    notification_occurs : titleDetails['notification_occurs'],
                    notitification_issue_reporter : titleDetails['notitification_issue_reporter'],
                    notification_issue_assignee : titleDetails['notification_issue_assignee'],
                    notification_issue_watchers : titleDetails['notification_issue_watchers']
                });
                console.log(JSON.stringify(notificationData))
                notificationData.save((err,result) => {
                    if (err) {
                        console.log(`error occured ${err}`);
                    }
                    else if (check.isEmpty(result)) {
                        console.log('notification is not saved');
                    }
                    else
                    {
                        console.log('notification saved');
                    }
                });
            }   
        })
});

eventEmitter.on('add_watcher', (data) => {
    issueModel.updateOne({ issueId: data.issueId }, { watcher: data.watcher_id })
        .exec((err, result) => {
            if (err) {
                console.log(err);
            }
            else if (check.isEmpty(result)) {
                console.log("no issue found");
            }
            else {
                console.log("watchers updated");
            }
        })
});

eventEmitter.on('update-description', (data) => {
    issueModel.updateOne({ issueId: data.issue_id }, { issue_description: data.new_issue_description })
        .exec((err, result) => {
            if (err) {
                console.log(err);
            }
            else if (check.isEmpty(result)) {
                console.log("no issue found");
            }
            else {
                console.log("description updated");
                let notificationData = new NotificationModel({
                    notificationId : data['notificationId'],
                    notificationTitle : data['notificationTitle'],
                    Notification_issue_id :data['Notification_issue_id'],
                    notification_occurs : data['notification_occurs'],
                    notitification_issue_reporter : data['notitification_issue_reporter'],
                    notification_issue_assignee : data['notification_issue_assignee'],
                    notification_issue_watchers : data['notification_issue_watchers']
                });
                console.log(JSON.stringify(notificationData))
                notificationData.save((err,result) => {
                    if (err) {
                        console.log(`error occured ${err}`);
                    }
                    else if (check.isEmpty(result)) {
                        console.log('notification is not saved');
                    }
                    else
                    {
                        console.log('notification saved');
                    }
                });
            }
        })
});

eventEmitter.on('update-Assignee', (data) => {
    issueModel.updateOne({ issueId: data.issueId }, { issue_assignee: data.updated_assignee_id, issue_assignee_name: data.updated_assignee_name })
        .exec((err, result) => {
            if (err) {
                console.log(err);
            }
            else if (check.isEmpty(result)) {
                console.log("no issue found");
            }
            else {
                console.log("asssignee updated");
                let notificationData = new NotificationModel({
                    notificationId : data['notificationId'],
                    notificationTitle : data['notificationTitle'],
                    Notification_issue_id :data['Notification_issue_id'],
                    notification_occurs : data['notification_occurs'],
                    notitification_issue_reporter : data['notitification_issue_reporter'],
                    notification_issue_assignee : data['notification_issue_assignee'],
                    notification_issue_watchers : data['notification_issue_watchers']
                });
                console.log(JSON.stringify(notificationData))
                notificationData.save((err,result) => {
                    if (err) {
                        console.log(`error occured ${err}`);
                    }
                    else if (check.isEmpty(result)) {
                        console.log('notification is not saved');
                    }
                    else
                    {
                        console.log('notification saved');
                    }
                });
            }
        })
});

eventEmitter.on('update-Reporter', (data) => {
    issueModel.updateOne({ issueId: data.issueId }, { issue_reporter: data.updated_reporter_id, issue_reporter_name: data.updated_reporter_name })
        .exec((err, result) => {
            if (err) {
                console.log(err);
            }
            else if (check.isEmpty(result)) {
                console.log("no issue found");
            }
            else {
                console.log("reporter updated");
                let notificationData = new NotificationModel({
                    notificationId : data['notificationId'],
                    notificationTitle : data['notificationTitle'],
                    Notification_issue_id :data['Notification_issue_id'],
                    notification_occurs : data['notification_occurs'],
                    notitification_issue_reporter : data['notitification_issue_reporter'],
                    notification_issue_assignee : data['notification_issue_assignee'],
                    notification_issue_watchers : data['notification_issue_watchers']
                });
                console.log(JSON.stringify(notificationData))
                notificationData.save((err,result) => {
                    if (err) {
                        console.log(`error occured ${err}`);
                    }
                    else if (check.isEmpty(result)) {
                        console.log('notification is not saved');
                    }
                    else
                    {
                        console.log('notification saved');
                    }
                });
            }
        })
});

eventEmitter.on('update_issue_status', (data) => {
    issueModel.updateOne({ issueId: data.issueId }, { issue_status: data.updated_issue_status })
        .exec((err, result) => {
            if (err) {
                console.log(err);
            }
            else if (check.isEmpty(result)) {
                console.log("no issue found");
            }
            else {
                console.log("reporter updated");
                let notificationData = new NotificationModel({
                    notificationId : data['notificationId'],
                    notificationTitle : data['notificationTitle'],
                    Notification_issue_id :data['Notification_issue_id'],
                    notification_occurs : data['notification_occurs'],
                    notitification_issue_reporter : data['notitification_issue_reporter'],
                    notification_issue_assignee : data['notification_issue_assignee'],
                    notification_issue_watchers : data['notification_issue_watchers']
                });
                console.log(JSON.stringify(notificationData))
                notificationData.save((err,result) => {
                    if (err) {
                        console.log(`error occured ${err}`);
                    }
                    else if (check.isEmpty(result)) {
                        console.log('notification is not saved');
                    }
                    else
                    {
                        console.log('notification saved');
                    }
                });
            }
        })
});

eventEmitter.on('save-updated-attcahment', (data) => {
    issueModel.updateOne({ issueId: data.issueId }, { issue_attachments: data.issue_attachments, dropbox_id: data.dropbox_id })
        .exec((err, result) => {
            if (err) {
                console.log(err);
            }
            else if (check.isEmpty(result)) {
                console.log("no issue found");
            }
            else {
                console.log("attachment updated");
            }
        })
});

eventEmitter.on('save-comment', (data) => {
    console.log(JSON.stringify("comment dat = " + data))
    let newComment = new commentModel({
        commentId: data['commentId'],
        issueId: data['issueId'],
        commenter_user_id: data['commenter_user_id'],
        commenter_user_name: data['commenter_user_name'],
        comment: data['comment'],
        comment_posted_date: timeLib.now()
    });

    newComment.save((err, result) => {
        if (err) {
            console.log(`error occured ${err}`);
        }
        else if (check.isEmpty(result)) {
            console.log('comment is not saved');
        }
        else {
            console.log('comment saved');
            let notificationData = new NotificationModel({
                notificationId : data['notificationId'],
                notificationTitle : data['notificationTitle'],
                Notification_issue_id :data['Notification_issue_id'],
                notification_occurs : data['notification_occurs'],
                notitification_issue_reporter : data['notitification_issue_reporter'],
                notification_issue_assignee : data['notification_issue_assignee'],
                notification_issue_watchers : data['notification_issue_watchers']
            });
            console.log(JSON.stringify(notificationData))
            notificationData.save((err,result) => {
                if (err) {
                    console.log(`error occured ${err}`);
                }
                else if (check.isEmpty(result)) {
                    console.log('notification is not saved');
                }
                else
                {
                    console.log('notification saved');
                }
            });
        }
    });
});

eventEmitter.on('Update-Notification',(data) => {
    NotificationModel.updateOne({notificationId:data.notificationId,Notification_issue_id:data.Notification_issue_id},{notification_watched_by:data.notification_watched_by})
    .exec((err,result) => {
        if(err)
        {
            console.log(err);
        }
        else if(check.isEmpty(result))
        {
            console.log("notification not found");
        }
        else
        {
            console.log("notification updated");
        }
    })
})

module.exports = {
    setServer: setServer
}
