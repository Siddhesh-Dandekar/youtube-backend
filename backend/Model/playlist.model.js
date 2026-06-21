import mongoose from 'mongoose';

const objectId = mongoose.Schema.Types.ObjectId;

const playlistSchema = mongoose.Schema({
    ownerId: {
        type: objectId,
        ref: 'users',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80
    },
    description: {
        type: String,
        default: '',
        maxlength: 300
    },
    visibility: {
        type: String,
        enum: ['private', 'public'],
        default: 'private'
    },
    videos: [{
        videoId: {
            type: objectId,
            ref: 'videos',
            required: true
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

const playlistModel = mongoose.model('playlists', playlistSchema);

export default playlistModel;
