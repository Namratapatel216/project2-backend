const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let IssueSchema = new Schema({
    issueId:{
        type:String,
        default:''
    },
    issue_title:{
        type:String,
        default:''
    },
    issue_status:{
        type:String,
        default:''
    },
    issue_reporter:{
        type:String,
        default:''
    },
    issue_reporter_name:{
        type:String,
        default:''
    },
    issue_description:{
        type:String,
        default:''
    },
    issue_attachments:{
        type:String,
        default:''
    },
    issue_assignee:{
        type:String,
        default:''
    },
    issue_assignee_name:{
        type:String,
        default:''
    },
    issue_posted_date:{
        type:Date,
        default:''
    },
    dropbox_id : {
        type:String,
        default:''
    },
    watcher : {
        type:String,
        default:','
    }
});

module.exports = mongoose.model('Issue',IssueSchema);