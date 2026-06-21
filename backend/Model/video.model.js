import mongoose from 'mongoose';

const objectId = mongoose.Schema.Types.ObjectId;

//Creating Video Schema for storing data in valid Structure
const videoSchema = mongoose.Schema({
    title: {
        type: String,
        required : true,
    },
    videoUrl: {
        type: String,
        required : true,
        match: [/^https?:\/\//i, 'videoUrl must be a valid http(s) URL'],
    },
    thumbnailUrl: {
        type: String,
        required : true,
        match: [/^https?:\/\//i, 'thumbnailUrl must be a valid http(s) URL'],
    },
    description:{
        type: String,
        required : true
    },
    channelId : {
        type: objectId, 
        ref: 'channels', 
        required: true
    },
    userId:{
        type: objectId,
        ref: 'users',
        required: true,
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
    duration: {
        type: Number,
        default: 0,
        min: 0
    },
    comments:[
        {
            channelId: {
                type: objectId,
                ref: 'channels',
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
            },
            likes: {
                type: Number,
                default: 0
            },
            dislikes: {
                type: Number,
                default: 0
            },
            replies: [{
                channelId: {
                    type: objectId,
                    ref: 'channels',
                    required: true
                },
                text: {
                    type: String,
                    required: true
                },
                timestamp: {
                    type: Date,
                    default: Date.now
                }
            }]
        }
    ]
});

videoSchema.index({ title: 'text', description: 'text' });
videoSchema.index({ uploadDate: -1 });
videoSchema.index({ views: -1 });
videoSchema.index({ channelId: 1 });

const videoModel = mongoose.model('videos', videoSchema);

export default videoModel;
