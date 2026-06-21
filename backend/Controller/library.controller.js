import mongoose from 'mongoose';
import userModel from '../Model/user.model.js';
import videoModel from '../Model/video.model.js';
import playlistModel from '../Model/playlist.model.js';
import logger from '../utils/logger.js';

const isValidId = (id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
const sameId = (left, right) => left?.toString() === right?.toString();

const serverError = (res, label, err) => {
    logger.error(`${label} error`, err);
    return res.status(500).json({ error: true, message: 'Server error' });
};

const videoPopulate = {
    path: 'channelId',
    select: 'channelName channelProfile subscribers subscriberIds verified'
};

const serializeVideo = (video) => {
    const obj = video?.toObject ? video.toObject() : video;
    if (!obj) return null;
    const channel = obj.channelId && typeof obj.channelId === 'object' ? obj.channelId : null;
    return {
        ...obj,
        channelId: channel?._id || obj.channelId,
        channel: channel ? {
            _id: channel._id,
            channelName: channel.channelName,
            channelProfile: channel.channelProfile,
            subscribers: channel.subscriberIds?.length ?? channel.subscribers ?? 0,
            verified: !!channel.verified,
        } : null,
        commentCount: obj.comments?.length || 0,
    };
};

export async function getLibrary(req, res) {
    try {
        const user = await userModel.findById(req.user._id)
            .populate({ path: 'likedVideos', populate: videoPopulate })
            .populate({ path: 'watchLater', populate: videoPopulate })
            .populate({ path: 'history.videoId', populate: videoPopulate })
            .populate('subscribedChannels', 'channelName channelProfile subscribers subscriberIds description')
            .lean();
        const playlists = await playlistModel.find({ ownerId: req.user._id })
            .sort({ updatedAt: -1 })
            .populate({ path: 'videos.videoId', populate: videoPopulate })
            .lean();

        return res.status(200).json({
            likedVideos: (user.likedVideos || []).map(serializeVideo).filter(Boolean),
            watchLater: (user.watchLater || []).map(serializeVideo).filter(Boolean),
            history: (user.history || [])
                .slice()
                .sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt))
                .map(item => ({ ...item, video: serializeVideo(item.videoId), videoId: item.videoId?._id || item.videoId }))
                .filter(item => item.video),
            subscriptions: (user.subscribedChannels || []).map(channel => ({
                ...channel,
                subscribers: channel.subscriberIds?.length ?? channel.subscribers ?? 0
            })),
            playlists: playlists.map(playlist => ({
                ...playlist,
                videos: playlist.videos.map(item => ({ ...item, video: serializeVideo(item.videoId), videoId: item.videoId?._id || item.videoId }))
            }))
        });
    } catch (err) {
        return serverError(res, 'getLibrary', err);
    }
}

export async function getSubscriptionFeed(req, res) {
    try {
        const user = await userModel.findById(req.user._id).select('subscribedChannels');
        if (!user) {
            return res.status(401).json({ error: true, message: 'User not found' });
        }
        if (!user.subscribedChannels.length) {
            return res.status(200).json({ items: [] });
        }
        const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit || '24', 10) || 24));
        const videos = await videoModel
            .find({ channelId: { $in: user.subscribedChannels } })
            .sort({ uploadDate: -1 })
            .limit(limit)
            .populate(videoPopulate)
            .lean();
        return res.status(200).json({ items: videos.map(serializeVideo).filter(Boolean) });
    } catch (err) {
        return serverError(res, 'getSubscriptionFeed', err);
    }
}

export async function addHistory(req, res) {
    const videoid = req.params.videoid;
    if (!isValidId(videoid)) {
        return res.status(400).json({ error: true, message: 'Invalid Video ID' });
    }
    try {
        const video = await videoModel.findById(videoid).select('_id');
        if (!video) {
            return res.status(404).json({ error: true, message: 'Video not found' });
        }
        const user = await userModel.findById(req.user._id);
        user.history = user.history.filter(item => !sameId(item.videoId, videoid));
        user.history.unshift({ videoId: video._id, watchedAt: new Date() });
        user.history = user.history.slice(0, 100);
        await user.save();
        return res.status(200).json({ message: 'History updated' });
    } catch (err) {
        return serverError(res, 'addHistory', err);
    }
}

export async function clearHistory(req, res) {
    try {
        const user = await userModel.findById(req.user._id);
        user.history = [];
        await user.save();
        return res.status(200).json({ message: 'History cleared' });
    } catch (err) {
        return serverError(res, 'clearHistory', err);
    }
}

export async function toggleWatchLater(req, res) {
    const videoid = req.params.videoid;
    if (!isValidId(videoid)) {
        return res.status(400).json({ error: true, message: 'Invalid Video ID' });
    }
    try {
        const video = await videoModel.findById(videoid).select('_id');
        if (!video) {
            return res.status(404).json({ error: true, message: 'Video not found' });
        }
        const user = await userModel.findById(req.user._id);
        const saved = user.watchLater.some(id => sameId(id, videoid));
        user.watchLater = saved ? user.watchLater.filter(id => !sameId(id, videoid)) : [video._id, ...user.watchLater];
        await user.save();
        return res.status(200).json({ saved: !saved });
    } catch (err) {
        return serverError(res, 'toggleWatchLater', err);
    }
}

export async function getNotifications(req, res) {
    try {
        const user = await userModel.findById(req.user._id)
            .populate('notifications.channelId', 'channelName channelProfile')
            .populate('notifications.videoId', 'title thumbnailUrl')
            .lean();
        return res.status(200).json({
            items: (user.notifications || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
            unread: (user.notifications || []).filter(item => !item.read).length
        });
    } catch (err) {
        return serverError(res, 'getNotifications', err);
    }
}

export async function markNotificationRead(req, res) {
    const id = req.params.id;
    if (!isValidId(id)) {
        return res.status(400).json({ error: true, message: 'Invalid notification ID' });
    }
    try {
        const user = await userModel.findById(req.user._id);
        const notification = user.notifications.find(item => sameId(item._id, id));
        if (!notification) {
            return res.status(404).json({ error: true, message: 'Notification not found' });
        }
        notification.read = true;
        await user.save();
        return res.status(200).json({ message: 'Notification read' });
    } catch (err) {
        return serverError(res, 'markNotificationRead', err);
    }
}

export async function getPlaylists(req, res) {
    try {
        const playlists = await playlistModel.find({ ownerId: req.user._id })
            .sort({ updatedAt: -1 })
            .populate({ path: 'videos.videoId', populate: videoPopulate })
            .lean();
        return res.status(200).json({
            items: playlists.map(playlist => ({
                ...playlist,
                videos: playlist.videos.map(item => ({ ...item, video: serializeVideo(item.videoId), videoId: item.videoId?._id || item.videoId }))
            }))
        });
    } catch (err) {
        return serverError(res, 'getPlaylists', err);
    }
}

export async function createPlaylist(req, res) {
    try {
        const title = String(req.body.title || '').trim();
        const description = String(req.body.description || '').trim();
        if (!title) {
            return res.status(400).json({ error: true, message: 'Playlist title required' });
        }
        const playlist = await playlistModel.create({
            ownerId: req.user._id,
            title,
            description
        });
        return res.status(201).json(playlist);
    } catch (err) {
        return serverError(res, 'createPlaylist', err);
    }
}

export async function addVideoToPlaylist(req, res) {
    const playlistId = req.params.id;
    const videoid = req.params.videoid;
    if (!isValidId(playlistId) || !isValidId(videoid)) {
        return res.status(400).json({ error: true, message: 'Invalid IDs' });
    }
    try {
        const playlist = await playlistModel.findOne({ _id: playlistId, ownerId: req.user._id });
        const video = await videoModel.findById(videoid).select('_id');
        if (!playlist || !video) {
            return res.status(404).json({ error: true, message: 'Playlist or video not found' });
        }
        if (!playlist.videos.some(item => sameId(item.videoId, videoid))) {
            playlist.videos.unshift({ videoId: video._id });
            await playlist.save();
        }
        return res.status(200).json(playlist);
    } catch (err) {
        return serverError(res, 'addVideoToPlaylist', err);
    }
}

export async function removeVideoFromPlaylist(req, res) {
    const playlistId = req.params.id;
    const videoid = req.params.videoid;
    if (!isValidId(playlistId) || !isValidId(videoid)) {
        return res.status(400).json({ error: true, message: 'Invalid IDs' });
    }
    try {
        const playlist = await playlistModel.findOne({ _id: playlistId, ownerId: req.user._id });
        if (!playlist) {
            return res.status(404).json({ error: true, message: 'Playlist not found' });
        }
        playlist.videos = playlist.videos.filter(item => !sameId(item.videoId, videoid));
        await playlist.save();
        return res.status(200).json(playlist);
    } catch (err) {
        return serverError(res, 'removeVideoFromPlaylist', err);
    }
}

export async function deletePlaylist(req, res) {
    const playlistId = req.params.id;
    if (!isValidId(playlistId)) {
        return res.status(400).json({ error: true, message: 'Invalid playlist ID' });
    }
    try {
        const result = await playlistModel.findOneAndDelete({ _id: playlistId, ownerId: req.user._id });
        if (!result) {
            return res.status(404).json({ error: true, message: 'Playlist not found' });
        }
        return res.status(200).json({ message: 'Playlist deleted' });
    } catch (err) {
        return serverError(res, 'deletePlaylist', err);
    }
}
