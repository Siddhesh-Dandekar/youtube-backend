import mongoose from 'mongoose';

//Creating Channel Schema for storing data in valid Structure
const channelSchema = mongoose.Schema({
    channelName : {
        type: String,
        required: true,
        unique : true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
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
        default : "https://img.icons8.com/color/240/circled-user-male-skin-type-1-2--v1.png" 
    },
    channelBanner: {
        type: String,
        default: "https://i.redd.it/vjppkzbfg4ob1.png"
    },
    subscribers: {
        type: Number,
        default : 0
    },
    videos: {
        type : Array,
        default : []
    }
},{timestamps: true})

const channelModel = mongoose.model('channels',channelSchema);

export default channelModel;