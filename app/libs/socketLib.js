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
            if (data['issue_attachment_path'] === undefined || data['issue_attachment_path'] === null || data['issue_attachment_path'] === '') {
                data['check_for_what'] = "issue_creation"
                data['issueId'] = shortid.generate();
                setTimeout(function () {
                    eventEmitter.emit('save-issue', data);
                }, 2000);
                socket.to('edchat').broadcast.emit('send-all-async-issues', data);
                myio.emit(data.issue_reporter, data);
            }
            else {
                var base64result = data['issue_attachment_path'].substr(data['issue_attachment_path'].indexOf(',') + 1);
                var image_path = base64_decode(base64result, data['issue_attachment_name']);
                data['check_for_what'] = "issue_creation"
                data['issueId'] = shortid.generate();
                const dropbox = dropboxV2Api.authenticate({
                    token: '6hPiXZkjq4AAAAAAAAAAH9B5muHXcLt-aPHlHHmNQwwcZGN2HnvnGrBqkf4pPkj9'
                });
                dropbox({
                    resource: 'files/upload',
                    parameters: {
                        path: `/edwisor data/${data['issue_attachment_name']}`
                    },
                    readStream: fs.createReadStream(data['issue_attachment_name'])
                }, (err, result, response) => {
                    console.log("result = " + JSON.stringify(result));
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
                });
            }
        });//end of create issue function

        socket.emit('send-all-async-issues', data);

        socket.on('update-attachment', (data) => {
            var base64result = data['issue_attachment_path'].substr(data['issue_attachment_path'].indexOf(',') + 1);
            var image_path = base64_decode(base64result, data['issue_attachment_name']);
            data['check_for_what'] = "attachment_updated";
            const dropbox = dropboxV2Api.authenticate({
                token: '6hPiXZkjq4AAAAAAAAAAH9B5muHXcLt-aPHlHHmNQwwcZGN2HnvnGrBqkf4pPkj9'
            });
            dropbox({
                resource: 'files/upload',
                parameters: {
                    path: `/edwisor data/${data['issue_attachment_name']}`
                },
                readStream: fs.createReadStream(data['issue_attachment_name'])
            }, (err, result, response) => {
                console.log("result = " + JSON.stringify(result));
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
            console.log("updated title is called")
            titleDetails['check_for_what'] = "title_updated";
            setTimeout(function () {
                eventEmitter.emit('update-title', titleDetails);
            });
            myio.emit(titleDetails['issue_id'], titleDetails);
            socket.to('edchat').broadcast.emit('send-all-async-issues', titleDetails);
        });

        socket.on('update_description', (descriptionDetails) => {
            console.log("updated description is called")
            descriptionDetails['check_for_what'] = "description_updated";
            setTimeout(function () {
                eventEmitter.emit('update-description', descriptionDetails);
            });
            myio.emit(descriptionDetails['issue_id'], descriptionDetails);
            socket.to('edchat').broadcast.emit('send-all-async-issues', descriptionDetails);
        })

        socket.on('update-assignee', (assigneeDetails) => {
            console.log("updated assignee is called")
            assigneeDetails['check_for_what'] = "assignee_updated";
            setTimeout(function () {
                eventEmitter.emit('update-Assignee', assigneeDetails);
            });
            myio.emit(assigneeDetails['issueId'], assigneeDetails);
            socket.to('edchat').broadcast.emit('send-all-async-issues', assigneeDetails);
        });

        socket.on('update-reporter', (reporterDetails) => {
            console.log("updated reporter is called")
            reporterDetails['check_for_what'] = "reporter_updated";
            setTimeout(function () {
                eventEmitter.emit('update-Reporter', reporterDetails);
            });
            myio.emit(reporterDetails['issueId'], reporterDetails);
            socket.to('edchat').broadcast.emit('send-all-async-issues', reporterDetails);
        });

        socket.on('update-issue-status', (statusDetails) => {
            console.log("updated issue status is called")
            statusDetails['check_for_what'] = "status_updated";
            setTimeout(function () {
                eventEmitter.emit('update_issue_status', statusDetails);
            });
            myio.emit(statusDetails['issueId'], statusDetails);
            socket.to('edchat').broadcast.emit('send-all-async-issues', statusDetails);
        });

        socket.on('add-comment', (commentDetails) => {
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
            console.log(result);
        }
    });
})

module.exports = {
    setServer: setServer
}