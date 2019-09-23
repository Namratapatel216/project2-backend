const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const time = require('./../libs/timeLibs');
const comment = new Schema({
    commentId : {
        type:String,
        default:'',
        index:true,
        unique:true
    },
    issueId : {
        type:String,
        default:''
    },
    commenter_user_id : {
        type:String,
        default:''
    },
    commenter_user_name : {
        type:String,
        default:''
    },
    comment : {
        type:String,
        default:''
    },
    comment_posted_date : {
        type:String,
        default:time.now()
    }
});
module.exports = mongoose.model('comment',comment);