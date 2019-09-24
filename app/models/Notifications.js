const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const time = require('./../libs/timeLibs');
const Notification = new Schema({
    notificationId : {
        type:String,
        default:'',
        index:true,
        unique:true
    },
    notificationTitle : {
        type:String,
        default:''
    },
    Notification_issue_id : {
        type:String,
        default:''
    },
    notification_watched_by : {
        type:String,
        default:','
    },
    notification_posted_date : {
        type:String,
        default:time.now()
    },
    notitification_issue_reporter:{
        type:String,
        default:''
    },
    notification_issue_assignee : {
        type : String,
        default : ''
    },
    notification_issue_watchers : {
        type : String,
        default : ''
    },
    notification_occurs : {
        type:String,
        default : ''
    }

});
module.exports = mongoose.model('Notification',Notification);