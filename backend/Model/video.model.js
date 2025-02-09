import mongoose from 'mongoose';

//Creating Video Schema for storing data in valid Structure
const videoSchema = mongoose.Schema({
    title: {
        type: String,
        required : true,
    },
    videoUrl: {
        type: String, 
        required : true
    },
    thumbnailUrl: {
        type: String, 
        required : true
    },
    description:{
        type: String,
        required : true
    },
    channelId : {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'channels', 
        required: true
    },
    userId:{
        type: String,
        requied : true,
    },
    views:{
        type : Number,
        default : 0
    },
    likes:{
        type: Number,
        default : 0
    },
    dislikes:{
        type:Number,
        default: 0
    },
    uploadDate:{
        type : Date,
        default : Date.now   
    },
    comments:[
        {
            channelId: {
                type: String,
                required: true
            },
            text: {
                type: String,
                required: true
            },
            timestamp: {
                type: Date,
                required: true,
                default: Date.now
            }
        }
    ]
})

const videoModel = mongoose.model('videos', videoSchema);

export default videoModel;