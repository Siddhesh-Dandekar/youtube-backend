import userModel from "../Model/user.model.js";
import videoModel from "../Model/video.model.js";
import channelModel from "../Model/channel.model.js";
import mongoose from "mongoose";

const isValidId = (id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
const serverError = (res, label, err) => {
    console.error(`${label} error:`, err);
    return res.status(500).json({ error: true, message: 'Server error' });
};

export async function uploadvideo(req, res) {
    try {
        const title = String(req.body.title || '').trim();
        const thumbnailUrl = String(req.body.thumbnailUrl || '').trim();
        const videoUrl = String(req.body.videoUrl || '').trim();
        const description = String(req.body.description || '').trim();
        const { _id } = req.user;

        if (!title || !thumbnailUrl || !videoUrl || !description) {
            return res.status(400).json({ error: true, message: 'All fields are required' });
        }

        const UserDetails = await userModel.findById(_id);
        if (!UserDetails || !UserDetails.channelId) {
            return res.status(400).json({ error: true, message: 'Channel Not Created' });
        }

        const newVideo = new videoModel({
            title,
            thumbnailUrl,
            videoUrl,
            userId: _id.toString(),
            description,
            channelId: UserDetails.channelId,
        });

        const savedVideo = await newVideo.save();
        const channel = await channelModel.findById(UserDetails.channelId);
        channel.videos.push(savedVideo._id);
        await channel.save();
        return res.status(201).json(savedVideo);
    } catch (err) {
        return serverError(res, 'uploadvideo', err);
    }
}

export async function fetchVideos(req, res) {
    try {
        const videos = await videoModel.find().sort({ uploadDate: -1 });
        return res.status(200).json(videos);
    } catch (err) {
        return serverError(res, 'fetchVideos', err);
    }
}

export async function fetchVideoById(req, res) {
    const { id } = req.params;
    if (!isValidId(id)) {
        return res.status(400).json({ error: true, message: 'Invalid Video ID' });
    }
    try {
        const videoData = await videoModel.findById(id);
        if (!videoData) {
            return res.status(404).json({ error: true, message: 'Video not found' });
        }
        return res.status(200).json(videoData);
    } catch (err) {
        return serverError(res, 'fetchVideoById', err);
    }
}

export async function addViews(req, res) {
    const { videoid } = req.params;
    if (!isValidId(videoid)) {
        return res.status(400).json({ error: true, message: 'Invalid Video ID' });
    }
    try {
        const video = await videoModel.findByIdAndUpdate(
            videoid,
            { $inc: { views: 1 } },
            { new: true, projection: { views: 1 } }
        );
        if (!video) {
            return res.status(404).json({ error: true, message: 'Video not found' });
        }
        return res.status(200).json({ views: video.views });
    } catch (err) {
        return serverError(res, 'addViews', err);
    }
}

export async function addLikes(req, res) {
    const { videoid } = req.params;
    const { _id } = req.user;
    if (!isValidId(videoid)) {
        return res.status(400).json({ error: true, message: 'Invalid Video ID' });
    }
    try {
        const video = await videoModel.findById(videoid);
        const user = await userModel.findById(_id);
        if (!video) {
            return res.status(404).json({ error: true, message: 'Video not found' });
        }
        const alreadyLiked = user.likedVideos.some(x => x.toString() === videoid);
        const alreadyDisliked = user.dislikedVideos.some(x => x.toString() === videoid);
        if (alreadyDisliked) {
            video.dislikes = Math.max(0, video.dislikes - 1);
            user.dislikedVideos = user.dislikedVideos.filter(x => x.toString() !== videoid);
        }
        if (alreadyLiked) {
            video.likes = Math.max(0, video.likes - 1);
            user.likedVideos = user.likedVideos.filter(x => x.toString() !== videoid);
        } else {
            video.likes += 1;
            user.likedVideos.push(videoid);
        }
        await video.save();
        await user.save();
        return res.status(200).json({ likes: video.likes, dislikes: video.dislikes });
    } catch (err) {
        return serverError(res, 'addLikes', err);
    }
}

export async function addDislikes(req, res) {
    const { videoid } = req.params;
    const { _id } = req.user;
    if (!isValidId(videoid)) {
        return res.status(400).json({ error: true, message: 'Invalid Video ID' });
    }
    try {
        const video = await videoModel.findById(videoid);
        const user = await userModel.findById(_id);
        if (!video) {
            return res.status(404).json({ error: true, message: 'Video not found' });
        }
        const alreadyLiked = user.likedVideos.some(x => x.toString() === videoid);
        const alreadyDisliked = user.dislikedVideos.some(x => x.toString() === videoid);
        if (alreadyLiked) {
            video.likes = Math.max(0, video.likes - 1);
            user.likedVideos = user.likedVideos.filter(x => x.toString() !== videoid);
        }
        if (alreadyDisliked) {
            video.dislikes = Math.max(0, video.dislikes - 1);
            user.dislikedVideos = user.dislikedVideos.filter(x => x.toString() !== videoid);
        } else {
            video.dislikes += 1;
            user.dislikedVideos.push(videoid);
        }
        await video.save();
        await user.save();
        return res.status(200).json({ likes: video.likes, dislikes: video.dislikes });
    } catch (err) {
        return serverError(res, 'addDislikes', err);
    }
}

export async function AddComment(req, res) {
    try {
        const text = String(req.body.text || '').trim();
        const videoid = String(req.body.videoid || '');
        const { channelId } = req.user;

        if (!text || text.length > 1000) {
            return res.status(400).json({ error: true, message: 'Comment must be 1-1000 characters' });
        }
        if (!isValidId(videoid)) {
            return res.status(400).json({ error: true, message: 'Invalid Video ID' });
        }
        if (!channelId) {
            return res.status(400).json({ error: true, message: 'You must have a channel to comment' });
        }

        const VideoData = await videoModel.findById(videoid);
        if (!VideoData) {
            return res.status(404).json({ error: true, message: 'Video not found' });
        }
        VideoData.comments.unshift({ channelId: channelId.toString(), text });
        await VideoData.save();
        return res.status(201).json(VideoData.comments);
    } catch (err) {
        return serverError(res, 'AddComment', err);
    }
}

export async function DeleteComment(req, res) {
    try {
        const commentId = String(req.body.commentId || '');
        const videoid = String(req.body.videoid || '');
        const { channelId } = req.user;

        if (!isValidId(commentId) || !isValidId(videoid)) {
            return res.status(400).json({ error: true, message: 'Invalid IDs' });
        }
        if (!channelId) {
            return res.status(403).json({ error: true, message: 'Not allowed' });
        }

        const VideoData = await videoModel.findById(videoid);
        if (!VideoData) {
            return res.status(404).json({ error: true, message: 'Video not found' });
        }
        const CommentInfo = VideoData.comments.find(x => x._id.toString() === commentId);
        if (!CommentInfo || CommentInfo.channelId !== channelId.toString()) {
            return res.status(403).json({ error: true, message: 'Not allowed to delete this comment' });
        }
        VideoData.comments = VideoData.comments.filter(x => x._id.toString() !== commentId);
        await VideoData.save();
        return res.status(200).json(VideoData.comments);
    } catch (err) {
        return serverError(res, 'DeleteComment', err);
    }
}

export async function EditComment(req, res) {
    try {
        const commentId = String(req.body.commentId || '');
        const videoid = String(req.body.videoid || '');
        const Updatetext = String(req.body.Updatetext || '').trim();
        const { channelId } = req.user;

        if (!isValidId(commentId) || !isValidId(videoid)) {
            return res.status(400).json({ error: true, message: 'Invalid IDs' });
        }
        if (!Updatetext || Updatetext.length > 1000) {
            return res.status(400).json({ error: true, message: 'Comment must be 1-1000 characters' });
        }
        if (!channelId) {
            return res.status(403).json({ error: true, message: 'Not allowed' });
        }

        const VideoData = await videoModel.findById(videoid);
        if (!VideoData) {
            return res.status(404).json({ error: true, message: 'Video not found' });
        }
        const CommentInfo = VideoData.comments.find(x => x._id.toString() === commentId);
        if (!CommentInfo || CommentInfo.channelId !== channelId.toString()) {
            return res.status(403).json({ error: true, message: 'Not allowed to edit this comment' });
        }
        if (CommentInfo.text === Updatetext) {
            return res.status(200).json({ message: 'No changes' });
        }
        CommentInfo.text = Updatetext;
        await VideoData.save();
        return res.status(200).json({ text: Updatetext });
    } catch (err) {
        return serverError(res, 'EditComment', err);
    }
}

export async function DeleteVideo(req, res) {
    try {
        const videoid = String(req.body.videoid || '');
        const channelid = String(req.body.channelid || '');
        const { _id } = req.user;
        const userIdStr = _id.toString();

        if (!isValidId(videoid) || !isValidId(channelid)) {
            return res.status(400).json({ error: true, message: 'Invalid IDs' });
        }

        const VideoInfo = await videoModel.findById(videoid);
        const ChannelInfo = await channelModel.findById(channelid);
        if (!VideoInfo || !ChannelInfo) {
            return res.status(404).json({ error: true, message: 'Video or channel not found' });
        }
        if (ChannelInfo.userId.toString() !== userIdStr || VideoInfo.userId !== userIdStr) {
            return res.status(403).json({ error: true, message: 'You are not allowed to delete' });
        }
        ChannelInfo.videos = ChannelInfo.videos.filter(x => x.toString() !== videoid);
        await ChannelInfo.save();
        await videoModel.findByIdAndDelete(videoid);
        return res.status(200).json({ videos: ChannelInfo.videos });
    } catch (err) {
        return serverError(res, 'DeleteVideo', err);
    }
}

export async function EditVideo(req, res) {
    try {
        const videoid = String(req.body.videoid || '');
        const { _id } = req.user;
        const userIdStr = _id.toString();

        if (!isValidId(videoid)) {
            return res.status(400).json({ error: true, message: 'Invalid Video ID' });
        }

        const VideoInfo = await videoModel.findById(videoid);
        if (!VideoInfo || VideoInfo.userId !== userIdStr) {
            return res.status(403).json({ error: true, message: 'Not allowed to edit' });
        }

        if (typeof req.body.title === 'string') VideoInfo.title = req.body.title.trim();
        if (typeof req.body.thumbnailUrl === 'string') VideoInfo.thumbnailUrl = req.body.thumbnailUrl.trim();
        if (typeof req.body.description === 'string') VideoInfo.description = req.body.description.trim();
        await VideoInfo.save();
        return res.status(200).json(VideoInfo);
    } catch (err) {
        return serverError(res, 'EditVideo', err);
    }
}
