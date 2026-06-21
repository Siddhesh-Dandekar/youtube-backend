import channelModel from "../Model/channel.model.js";
import userModel from '../Model/user.model.js';
import mongoose from 'mongoose';

const isValidId = (id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
const serverError = (res, label, err) => {
    console.error(`${label} error:`, err);
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
        const updateUser = await userModel.findOneAndUpdate(
            { _id: savedchannel.userId },
            { channelId: savedchannel._id },
            { new: true }
        );
        return res.status(201).json(updateUser);
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
        const channelInfo = await channelModel.findById(channelId);
        if (!channelInfo) {
            return res.status(404).json({ error: true, message: 'Channel not found' });
        }
        return res.status(200).json(channelInfo);
    } catch (err) {
        return serverError(res, 'fetchChannel', err);
    }
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
        return res.status(200).json({ message: 'updated' });
    } catch (err) {
        return serverError(res, 'updateChannel', err);
    }
}
