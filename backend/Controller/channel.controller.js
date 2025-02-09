import channelModel from "../Model/channel.model.js";
import userModel from '../Model/user.model.js'


//This Function Allows to store New Channel Details
export async function createChannel(req, res) {
    try {
        const { channelName, description, channelProfile } = req.body;
        const { _id } = req.user;
        const ExistingChannel = await userModel.findById(_id);
        if (ExistingChannel.channelId) {
            throw new Error("Channel Already Exists");
        }
        else {
            const newChannel = new channelModel({
                channelName: channelName,
                userId: _id,
                description: description,
                channelProfile: channelProfile
            })

            const savedchannel = await newChannel.save();
            const updateUser = await userModel.findOneAndUpdate({ _id: savedchannel.userId }, { channelId: savedchannel._id })
            return res.json(updateUser)
        }

    }
    catch (err) {
        return res.json({ error: true, message: err.message })
    }

}

//This Function allows to Fetch Channel Details
export async function fetchChannel(req, res) {
    const channelId = req.params.id;
    try {
        const channelInfo = await channelModel.findById(channelId);
        if (!channelInfo) {
            return res.status(404).json({ message: 'Channel not found' });
        }
        return res.json(channelInfo);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

//This function is used to Update Existing Channel Details
export async function updateChannel(req, res) {
    try {
        const { channelName, channelProfile, channelBanner , description } = req.body;
        const { _id } = req.user;
        const ExistingChannel = await userModel.findById(_id);
        if (!ExistingChannel.channelId) {
            throw new Error("Channel doesn't exist");
        }
        const ChannelInfo = await channelModel.findById(ExistingChannel.channelId);
        if(channelName){
            ChannelInfo.channelName = channelName;
            await ChannelInfo.save();
            return res.json({message : "updated"})
        }
        if(channelProfile){
            ChannelInfo.channelProfile = channelProfile;
            await ChannelInfo.save();
            return res.json({message : "updated"})
        }
        if(channelBanner){
            ChannelInfo.channelBanner = channelBanner;
            await ChannelInfo.save();
            return res.json({message : "updated"})
        }
        if(description){
            ChannelInfo.description = description;
            await ChannelInfo.save();
            return res.json({message : "updated"})
        }

    } catch (err) {
        return res.json({ error: true, message: err.message })
    }

}