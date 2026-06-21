import userModel from "../Model/user.model.js";
import videoModel from "../Model/video.model.js";
import channelModel from "../Model/channel.model.js";
import mongoose from "mongoose";
import logger from '../utils/logger.js';

const isValidId = (id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
const sameId = (left, right) => left?.toString() === right?.toString();
const serverError = (res, label, err) => {
    logger.error(`${label} error`, err);
    return res.status(500).json({ error: true, message: 'Server error' });
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePage = (req) => {
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit || '12', 10) || 12));
    return { page, limit, skip: (page - 1) * limit };
};

const serializeVideo = (video) => {
    const obj = video?.toObject ? video.toObject() : video;
    if (!obj) return null;
    const channel = obj.channelId && typeof obj.channelId === 'object' ? obj.channelId : obj.channel;
    return {
        ...obj,
        channelId: channel?._id || obj.channelId,
        userId: obj.userId?._id || obj.userId,
        channel: channel ? {
            _id: channel._id,
            channelName: channel.channelName,
            channelProfile: channel.channelProfile,
            subscribers: channel.subscriberIds?.length ?? channel.subscribers ?? 0,
            verified: !!channel.verified,
        } : obj.channel || null,
        commentCount: obj.comments?.length || 0,
    };
};

const buildVideoFilter = (req) => {
    const filter = {};
    const q = String(req.query.q || '').trim();
    const category = String(req.query.category || '').trim();
    const term = q || category;
    if (term) {
        const rx = new RegExp(escapeRegex(term), 'i');
        filter.$or = [{ title: rx }, { description: rx }];
    }
    if (req.query.channelId && isValidId(String(req.query.channelId))) {
        filter.channelId = req.query.channelId;
    }
    return filter;
};

const sortFor = (sort) => {
    if (sort === 'trending') return { views: -1, likes: -1, uploadDate: -1 };
    if (sort === 'popular') return { likes: -1, views: -1, uploadDate: -1 };
    return { uploadDate: -1 };
};

export async function uploadvideo(req, res) {
    try {
        const title = String(req.body.title || '').trim();
        const thumbnailUrl = String(req.body.thumbnailUrl || '').trim();
        const videoUrl = String(req.body.videoUrl || '').trim();
        const description = String(req.body.description || '').trim();
        const duration = Math.max(0, Number(req.body.duration) || 0);
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
            userId: _id,
            description,
            duration,
            channelId: UserDetails.channelId,
        });

        const savedVideo = await newVideo.save();
        const channel = await channelModel.findById(UserDetails.channelId);
        channel.videos.push(savedVideo._id);
        await channel.save();

        const subscribers = await userModel.find({ subscribedChannels: channel._id });
        await Promise.all(subscribers.map(subscriber => {
            subscriber.notifications.unshift({
                type: 'video',
                channelId: channel._id,
                videoId: savedVideo._id,
                message: `${channel.channelName} posted ${savedVideo.title}`
            });
            subscriber.notifications = subscriber.notifications.slice(0, 50);
            return subscriber.save();
        }));

        return res.status(201).json(serializeVideo(savedVideo));
    } catch (err) {
        return serverError(res, 'uploadvideo', err);
    }
}

export async function fetchVideos(req, res) {
    try {
        const { page, limit, skip } = parsePage(req);
        const filter = buildVideoFilter(req);
        const sort = sortFor(String(req.query.sort || 'recent'));
        const [videos, total] = await Promise.all([
            videoModel.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate('channelId', 'channelName channelProfile subscribers subscriberIds verified')
                .lean(),
            videoModel.countDocuments(filter)
        ]);
        const totalPages = Math.max(1, Math.ceil(total / limit));
        return res.status(200).json({
            items: videos.map(serializeVideo),
            page,
            limit,
            total,
            totalPages,
            hasMore: page < totalPages
        });
    } catch (err) {
        return serverError(res, 'fetchVideos', err);
    }
}

export async function searchVideos(req, res) {
    req.query.q = req.query.q || '';
    return fetchVideos(req, res);
}

export async function fetchTrending(req, res) {
    req.query.sort = 'trending';
    return fetchVideos(req, res);
}

export async function fetchRecommendations(req, res) {
    try {
        const limit = Math.min(20, Math.max(1, Number.parseInt(req.query.limit || '10', 10) || 10));
        const exclude = String(req.query.exclude || '');
        const filter = isValidId(exclude) ? { _id: { $ne: exclude } } : {};
        const videos = await videoModel.find(filter)
            .sort({ views: -1, likes: -1, uploadDate: -1 })
            .limit(limit)
            .populate('channelId', 'channelName channelProfile subscribers subscriberIds verified')
            .lean();
        return res.status(200).json({ items: videos.map(serializeVideo) });
    } catch (err) {
        return serverError(res, 'fetchRecommendations', err);
    }
}

export async function fetchVideoById(req, res) {
    const { id } = req.params;
    if (!isValidId(id)) {
        return res.status(400).json({ error: true, message: 'Invalid Video ID' });
    }
    try {
        const videoData = await videoModel.findById(id)
            .populate('channelId', 'channelName channelProfile subscribers subscriberIds verified')
            .populate('comments.channelId', 'channelName channelProfile')
            .populate('comments.replies.channelId', 'channelName channelProfile')
            .lean();
        if (!videoData) {
            return res.status(404).json({ error: true, message: 'Video not found' });
        }
        return res.status(200).json(serializeVideo(videoData));
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
        if (!video || !user) {
            return res.status(404).json({ error: true, message: 'Video or user not found' });
        }
        const alreadyLiked = user.likedVideos.some(x => sameId(x, videoid));
        const alreadyDisliked = user.dislikedVideos.some(x => sameId(x, videoid));
        if (alreadyDisliked) {
            video.dislikes = Math.max(0, video.dislikes - 1);
            user.dislikedVideos = user.dislikedVideos.filter(x => !sameId(x, videoid));
        }
        if (alreadyLiked) {
            video.likes = Math.max(0, video.likes - 1);
            user.likedVideos = user.likedVideos.filter(x => !sameId(x, videoid));
        } else {
            video.likes += 1;
            user.likedVideos.push(video._id);
        }
        await video.save();
        await user.save();
        return res.status(200).json({ likes: video.likes, dislikes: video.dislikes, liked: !alreadyLiked, disliked: false });
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
        if (!video || !user) {
            return res.status(404).json({ error: true, message: 'Video or user not found' });
        }
        const alreadyLiked = user.likedVideos.some(x => sameId(x, videoid));
        const alreadyDisliked = user.dislikedVideos.some(x => sameId(x, videoid));
        if (alreadyLiked) {
            video.likes = Math.max(0, video.likes - 1);
            user.likedVideos = user.likedVideos.filter(x => !sameId(x, videoid));
        }
        if (alreadyDisliked) {
            video.dislikes = Math.max(0, video.dislikes - 1);
            user.dislikedVideos = user.dislikedVideos.filter(x => !sameId(x, videoid));
        } else {
            video.dislikes += 1;
            user.dislikedVideos.push(video._id);
        }
        await video.save();
        await user.save();
        return res.status(200).json({ likes: video.likes, dislikes: video.dislikes, liked: false, disliked: !alreadyDisliked });
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
        VideoData.comments.unshift({ channelId, text });
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
        const CommentInfo = VideoData.comments.find(x => sameId(x._id, commentId));
        if (!CommentInfo || !sameId(CommentInfo.channelId, channelId)) {
            return res.status(403).json({ error: true, message: 'Not allowed to delete this comment' });
        }
        VideoData.comments = VideoData.comments.filter(x => !sameId(x._id, commentId));
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
        const CommentInfo = VideoData.comments.find(x => sameId(x._id, commentId));
        if (!CommentInfo || !sameId(CommentInfo.channelId, channelId)) {
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

export async function ReplyComment(req, res) {
    try {
        const commentId = String(req.body.commentId || '');
        const videoid = String(req.body.videoid || '');
        const text = String(req.body.text || '').trim();
        const { channelId } = req.user;
        if (!isValidId(commentId) || !isValidId(videoid)) {
            return res.status(400).json({ error: true, message: 'Invalid IDs' });
        }
        if (!text || text.length > 1000) {
            return res.status(400).json({ error: true, message: 'Reply must be 1-1000 characters' });
        }
        if (!channelId) {
            return res.status(400).json({ error: true, message: 'You must have a channel to reply' });
        }
        const VideoData = await videoModel.findById(videoid);
        const CommentInfo = VideoData?.comments.find(x => sameId(x._id, commentId));
        if (!CommentInfo) {
            return res.status(404).json({ error: true, message: 'Comment not found' });
        }
        CommentInfo.replies.push({ channelId, text });
        await VideoData.save();
        return res.status(201).json(CommentInfo.replies);
    } catch (err) {
        return serverError(res, 'ReplyComment', err);
    }
}

export async function ReactComment(req, res) {
    try {
        const { videoid, commentid, reaction } = req.params;
        if (!isValidId(videoid) || !isValidId(commentid) || !['like', 'dislike'].includes(reaction)) {
            return res.status(400).json({ error: true, message: 'Invalid request' });
        }
        const VideoData = await videoModel.findById(videoid);
        const CommentInfo = VideoData?.comments.find(x => sameId(x._id, commentid));
        if (!CommentInfo) {
            return res.status(404).json({ error: true, message: 'Comment not found' });
        }
        if (reaction === 'like') CommentInfo.likes += 1;
        if (reaction === 'dislike') CommentInfo.dislikes += 1;
        await VideoData.save();
        return res.status(200).json({ likes: CommentInfo.likes, dislikes: CommentInfo.dislikes });
    } catch (err) {
        return serverError(res, 'ReactComment', err);
    }
}

export async function DeleteVideo(req, res) {
    try {
        const videoid = String(req.body.videoid || '');
        const channelid = String(req.body.channelid || '');
        const { _id } = req.user;

        if (!isValidId(videoid) || !isValidId(channelid)) {
            return res.status(400).json({ error: true, message: 'Invalid IDs' });
        }

        const VideoInfo = await videoModel.findById(videoid);
        const ChannelInfo = await channelModel.findById(channelid);
        if (!VideoInfo || !ChannelInfo) {
            return res.status(404).json({ error: true, message: 'Video or channel not found' });
        }
        if (!sameId(ChannelInfo.userId, _id) || !sameId(VideoInfo.userId, _id)) {
            return res.status(403).json({ error: true, message: 'You are not allowed to delete' });
        }
        ChannelInfo.videos = ChannelInfo.videos.filter(x => !sameId(x, videoid));
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

        if (!isValidId(videoid)) {
            return res.status(400).json({ error: true, message: 'Invalid Video ID' });
        }

        const VideoInfo = await videoModel.findById(videoid);
        if (!VideoInfo || !sameId(VideoInfo.userId, _id)) {
            return res.status(403).json({ error: true, message: 'Not allowed to edit' });
        }

        if (typeof req.body.title === 'string') VideoInfo.title = req.body.title.trim();
        if (typeof req.body.thumbnailUrl === 'string') VideoInfo.thumbnailUrl = req.body.thumbnailUrl.trim();
        if (typeof req.body.description === 'string') VideoInfo.description = req.body.description.trim();
        if (req.body.duration !== undefined) {
            const next = Math.max(0, Number(req.body.duration) || 0);
            VideoInfo.duration = next;
        }
        await VideoInfo.save();
        return res.status(200).json(serializeVideo(VideoInfo));
    } catch (err) {
        return serverError(res, 'EditVideo', err);
    }
}
