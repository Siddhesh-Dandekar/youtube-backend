import channelModel from "../Model/channel.model.js";
import userModel from '../Model/user.model.js';
import videoModel from '../Model/video.model.js';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const isValidId = (id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
const sameId = (left, right) => left?.toString() === right?.toString();
const serverError = (res, label, err) => {
    logger.error(`${label} error`, err);
    return res.status(500).json({ error: true, message: 'Server error' });
};

export async function createChannel(req, res) {
    try {
        const channelName = String(req.body.channelName || '').trim();
        const description = String(req.body.description || '').trim();
        const channelProfile = String(req.body.channelProfile || '').trim();
        const { _id } = req.user;

        if (!channelName || channelName.length > 60) {
            return res.status(400).json({ error: true, message: 'Invalid channel name' });
        }

        const existing = await userModel.findById(_id);
        if (!existing) {
            return res.status(401).json({ error: true, message: 'User not found' });
        }
        if (existing.channelId) {
            return res.status(400).json({ error: true, message: 'Channel Already Exists' });
        }

        const newChannel = new channelModel({
            channelName,
            userId: _id,
            description: description || undefined,
            channelProfile: channelProfile || undefined,
        });
        const savedchannel = await newChannel.save();
        await userModel.findOneAndUpdate(
            { _id: savedchannel.userId },
            { channelId: savedchannel._id },
            { new: true }
        );
        return res.status(201).json({ channelId: savedchannel._id, channel: savedchannel });
    } catch (err) {
        return serverError(res, 'createChannel', err);
    }
}

export async function fetchChannel(req, res) {
    const channelId = req.params.id;
    if (!isValidId(channelId)) {
        return res.status(400).json({ error: true, message: 'Invalid Channel ID' });
    }
    try {
        const channelInfo = await channelModel.findById(channelId).lean();
        if (!channelInfo) {
            return res.status(404).json({ error: true, message: 'Channel not found' });
        }
        channelInfo.subscribers = channelInfo.subscriberIds?.length ?? channelInfo.subscribers ?? 0;
        return res.status(200).json(channelInfo);
    } catch (err) {
        return serverError(res, 'fetchChannel', err);
    }
}

export async function fetchChannelVideos(req, res) {
    const channelId = req.params.id;
    if (!isValidId(channelId)) {
        return res.status(400).json({ error: true, message: 'Invalid Channel ID' });
    }
    try {
        const videos = await videoModel
            .find({ channelId })
            .sort({ uploadDate: -1 })
            .populate('channelId', 'channelName channelProfile subscribers subscriberIds verified')
            .lean();
        return res.status(200).json(videos.map(serializeChannelVideo));
    } catch (err) {
        return serverError(res, 'fetchChannelVideos', err);
    }
}

function serializeChannelVideo(video) {
    const channel = video.channelId;
    return {
        ...video,
        channelId: channel?._id || video.channelId,
        channel: channel ? {
            _id: channel._id,
            channelName: channel.channelName,
            channelProfile: channel.channelProfile,
            subscribers: channel.subscriberIds?.length ?? channel.subscribers ?? 0,
            verified: !!channel.verified,
        } : null
    };
}

export async function updateChannel(req, res) {
    try {
        const { _id } = req.user;
        const ExistingChannel = await userModel.findById(_id);
        if (!ExistingChannel) {
            return res.status(401).json({ error: true, message: 'User not found' });
        }
        if (!ExistingChannel.channelId) {
            return res.status(400).json({ error: true, message: "Channel doesn't exist" });
        }
        const ChannelInfo = await channelModel.findById(ExistingChannel.channelId);
        if (!ChannelInfo) {
            return res.status(404).json({ error: true, message: 'Channel not found' });
        }

        let updated = false;
        if (typeof req.body.channelName === 'string' && req.body.channelName.trim()) {
            ChannelInfo.channelName = req.body.channelName.trim();
            updated = true;
        }
        if (typeof req.body.channelProfile === 'string') {
            ChannelInfo.channelProfile = req.body.channelProfile.trim();
            updated = true;
        }
        if (typeof req.body.channelBanner === 'string') {
            ChannelInfo.channelBanner = req.body.channelBanner.trim();
            updated = true;
        }
        if (typeof req.body.description === 'string') {
            ChannelInfo.description = req.body.description.trim();
            updated = true;
        }

        if (!updated) {
            return res.status(400).json({ error: true, message: 'No valid fields to update' });
        }

        await ChannelInfo.save();
        return res.status(200).json(ChannelInfo);
    } catch (err) {
        return serverError(res, 'updateChannel', err);
    }
}

export async function toggleSubscription(req, res) {
    const channelId = req.params.id;
    if (!isValidId(channelId)) {
        return res.status(400).json({ error: true, message: 'Invalid Channel ID' });
    }

    try {
        const user = await userModel.findById(req.user._id);
        const channel = await channelModel.findById(channelId);
        if (!user || !channel) {
            return res.status(404).json({ error: true, message: 'User or channel not found' });
        }
        if (sameId(channel.userId, user._id)) {
            return res.status(400).json({ error: true, message: 'You cannot subscribe to your own channel' });
        }

        const subscribed = user.subscribedChannels.some(id => sameId(id, channel._id));
        if (subscribed) {
            user.subscribedChannels = user.subscribedChannels.filter(id => !sameId(id, channel._id));
            channel.subscriberIds = channel.subscriberIds.filter(id => !sameId(id, user._id));
        } else {
            user.subscribedChannels.push(channel._id);
            if (!channel.subscriberIds.some(id => sameId(id, user._id))) {
                channel.subscriberIds.push(user._id);
            }
            const owner = await userModel.findById(channel.userId);
            if (owner) {
                owner.notifications.unshift({
                    type: 'subscription',
                    channelId: channel._id,
                    message: `${user.username} subscribed to ${channel.channelName}`
                });
                owner.notifications = owner.notifications.slice(0, 50);
                await owner.save();
            }
        }

        channel.subscribers = channel.subscriberIds.length;
        await user.save();
        await channel.save();
        return res.status(200).json({
            subscribed: !subscribed,
            subscribers: channel.subscribers
        });
    } catch (err) {
        return serverError(res, 'toggleSubscription', err);
    }
}

export async function subscriptionStatus(req, res) {
    const channelId = req.params.id;
    if (!isValidId(channelId)) {
        return res.status(400).json({ error: true, message: 'Invalid Channel ID' });
    }
    try {
        const user = await userModel.findById(req.user._id).select('subscribedChannels');
        const channel = await channelModel.findById(channelId).select('subscribers subscriberIds');
        if (!user || !channel) {
            return res.status(404).json({ error: true, message: 'User or channel not found' });
        }
        return res.status(200).json({
            subscribed: user.subscribedChannels.some(id => sameId(id, channelId)),
            subscribers: channel.subscriberIds?.length ?? channel.subscribers ?? 0
        });
    } catch (err) {
        return serverError(res, 'subscriptionStatus', err);
    }
}
