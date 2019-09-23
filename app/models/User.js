const mongoose = require('mongoose');

const Schema = mongoose.Schema;

let UserSchema = new Schema({

    userId:{
        type:String,
        default:'',
        index:true,
        unique:true
    },
    userName:{
        type:String,
        default:''
    },
    email:{
        type:String,
        default:''
    },
    password:{
        type:String,
        default:''
    },
    mobileNumber:{
        type:Number,
        default:0
    },
    country_code:{
        type:String,
        default:''
    },
    country_name:{
        type:String,
        default:''
    },
    createdOn:{
        type:Date,
        default:''
    },
    is_verified:{
        type:Boolean,
        default:false
    },
    socialPlatform:{
        type:String,
        default:''
    },
    provider:{
        type:String,
        default:''
    },
    provider_id:{
        type:String,
        default:''
    },
    provider_pic:{
        type:String,
        default:''
    },
    token:{
        type:String,
        default:''
    }
});

module.exports = mongoose.model('User',UserSchema);