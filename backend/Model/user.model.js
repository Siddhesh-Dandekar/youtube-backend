import mongoose from "mongoose";
//Creating user Schema for storing data in valid Structure
const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: 'https://yt3.ggpht.com/RAnCvom2Cnxn5g5xe1Vz5T4S9167TWv18cz2MTUu1hXv_tNZ-h2b34RoWPQqtAhvwXdgDijE=s108-c-k-c0x00ffffff-no-rj'
    },
    channelId: {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'channels',
        default : null,
    },
    likedVideos : {
        type: Array,
        default: []
    },
    dislikedVideos : {
        type: Array,
        default: []
    }
})

const userModel = mongoose.model('users', userSchema);

export default userModel;