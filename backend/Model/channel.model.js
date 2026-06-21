import mongoose from 'mongoose';

const objectId = mongoose.Schema.Types.ObjectId;

//Creating Channel Schema for storing data in valid Structure
const channelSchema = mongoose.Schema({
    channelName : {
        type: String,
        required: true,
        unique : true
    },
    userId: {
        type: objectId,
        ref:'users',
        required: true,
        unique : true
    },
    description: {
        type : String,
        default : "More about this channel...",
    },
    channelProfile:{
        type: String,
        required:false,
        default : "https://img.icons8.com/color/240/circled-user-male-skin-type-1-2--v1.png",
        match: [/^https?:\/\//i, 'channelProfile must be a valid http(s) URL'],
    },
    channelBanner: {
        type: String,
        default: "https://i.redd.it/vjppkzbfg4ob1.png",
        match: [/^https?:\/\//i, 'channelBanner must be a valid http(s) URL'],
    },
    subscribers: {
        type: Number,
        default : 0
    },
    videos: {
        type : [{
            type: objectId,
            ref: 'videos'
        }],
        default : []
    },
    subscriberIds: [{
        type: objectId,
        ref: 'users'
    }],
    verified: {
        type: Boolean,
        default: false
    }
},{timestamps: true});

channelSchema.index({ channelName: 'text', description: 'text' });

const channelModel = mongoose.model('channels',channelSchema);

export default channelModel;
