import mongoose from "mongoose";

const objectId = mongoose.Schema.Types.ObjectId;

//Creating user Schema for storing data in valid Structure
const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: 'https://yt3.ggpht.com/RAnCvom2Cnxn5g5xe1Vz5T4S9167TWv18cz2MTUu1hXv_tNZ-h2b34RoWPQqtAhvwXdgDijE=s108-c-k-c0x00ffffff-no-rj',
        match: [/^https?:\/\//i, 'Avatar must be a valid http(s) URL'],
    },
    channelId: {
        type : objectId,
        ref : 'channels',
        default : null,
    },
    likedVideos : [{
        type: objectId,
        ref: 'videos'
    }],
    dislikedVideos : [{
        type: objectId,
        ref: 'videos'
    }],
    watchLater: [{
        type: objectId,
        ref: 'videos'
    }],
    history: [{
        videoId: {
            type: objectId,
            ref: 'videos',
            required: true
        },
        watchedAt: {
            type: Date,
            default: Date.now
        }
    }],
    subscribedChannels: [{
        type: objectId,
        ref: 'channels'
    }],
    notifications: [{
        type: {
            type: String,
            enum: ['subscription', 'video', 'system'],
            default: 'system'
        },
        channelId: {
            type: objectId,
            ref: 'channels',
            default: null
        },
        videoId: {
            type: objectId,
            ref: 'videos',
            default: null
        },
        message: {
            type: String,
            required: true
        },
        read: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: {
        type: String,
        default: null
    },
    passwordResetToken: {
        type: String,
        default: null
    },
    passwordResetExpires: {
        type: Date,
        default: null
    }
}, { timestamps: true });

userSchema.index({ emailVerificationToken: 1 }, { sparse: true });
userSchema.index({ passwordResetToken: 1 }, { sparse: true });

const userModel = mongoose.model('users', userSchema);

export default userModel;
