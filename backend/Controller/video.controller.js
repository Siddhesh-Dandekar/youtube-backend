import userModel from "../Model/user.model.js";
import videoModel from "../Model/video.model.js";
import channelModel from "../Model/channel.model.js";
import mongoose from "mongoose";

//This function is used to store new Video Details
export async function uploadvideo(req, res) {
    const { title, thumbnailUrl, description, videoUrl } = req.body;
    const { _id } = req.user;
    try {
        const UserDetails = await userModel.findById(_id);
        if (!UserDetails.channelId) {
            throw new Error('Channel Not Created');
        }
        const newVideo = new videoModel({
            title: title,
            thumbnailUrl: thumbnailUrl,
            videoUrl: videoUrl,
            userId: _id,
            description: description,
            channelId: UserDetails.channelId
        })

        const savedVideo = await newVideo.save();
        const channel = await channelModel.findById(UserDetails.channelId);
        channel.videos.push(savedVideo._id);
        channel.save();
        return res.send(savedVideo)

    }
    catch (err) {
        return res.json({ message: err.message })
    }
}

//This function is used to Retrieve all Videos
export async function fetchVideos(req, res) {
    try {
        const videos = await videoModel.find().sort({ uploadDate: -1 });
        return res.send(videos);
    }
    catch (err) {
        return res.json({ message: err.message })
    }
}

//This function is used to Retrieve Video by his Id
export async function fetchVideoById(req, res) {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid Video ID format' });
    }

    try {
        const videoData = await videoModel.findById(id);
        if (!videoData) {
            return res.status(404).json({ message: 'Video not found' });
        }
        return res.status(200).json(videoData);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

//This function increament video views
export async function addViews(req, res) {
    const { videoid } = req.params;
    try {
        const video = await videoModel.findById(videoid);
        if (!video) {
            return res.status(404).send({ error: 'Video not found' });
        }
        video.views += 1;
        await video.save();

        return res.status(200).send({ views: video.views });
    } catch (err) {
        return res.status(500).send({ error: 'An error occurred while updating the views', details: err.message });
    }
}

//This function add likes but we user has already liked it will Remove his like
export async function addLikes(req, res) {
    const { videoid } = req.params;
    const { _id } = req.user;
    try {
        const video = await videoModel.findById(videoid);
        const user = await userModel.findById(_id);
        if (!video) {
            return res.status(404).send({ error: 'Video not found' });
        }
        const AlreadyLiked = user.likedVideos.find(x => x == video._id);
        const AlreadyDisLiked = user.dislikedVideos.find(x => x == video._id);
        if(AlreadyDisLiked){
            video.dislikes -= 1;
            const filteredDisLiked = user.dislikedVideos.filter( x => x!== videoid);
            user.dislikedVideos = filteredDisLiked;
            await video.save();
            await user.save();
        }
        if (AlreadyLiked) {
            video.likes -= 1;
            const filteredLiked = user.likedVideos.filter(x => x !== videoid);
            user.likedVideos = filteredLiked;
            await video.save();
            await user.save();
            return res.status(200).send({ likes : video.likes, dislikes: video.dislikes })
        }
        
        video.likes += 1;
        user.likedVideos.push(videoid);
        await video.save();
        await user.save();

        return res.status(200).send({likes : video.likes, dislikes: video.dislikes});
    } catch (err) {
        return res.status(500).send({ error: 'An error occurred while updating the views', details: err.message });
    }
}

//This function add dislikes but it also check weather user has already liked or disliked video
export async function addDislikes(req, res) {
    const { videoid } = req.params;
    const { _id } = req.user;
    try {
        const video = await videoModel.findById(videoid);
        const user = await userModel.findById(_id);
        if (!video) {
            return res.status(404).send({ error: 'Video not found' });
        }
        const AlreadyLiked = user.likedVideos.find(x => x == video._id);
        const AlreadyDisLiked = user.dislikedVideos.find(x => x == video._id);
        if (AlreadyLiked) {
            video.likes -= 1;
            const filteredLiked = user.likedVideos.filter(x => x !== videoid);
            user.likedVideos = filteredLiked;
            await video.save();
            await user.save();
        }
        if (AlreadyDisLiked) {
            video.dislikes -= 1;
            const filteredDisLiked = user.dislikedVideos.filter(x => x !== videoid);
            user.dislikedVideos = filteredDisLiked;
            await video.save();
            await user.save();
            return res.status(200).send({ likes : video.likes, dislikes: video.dislikes})
        }
        video.dislikes += 1;
        user.dislikedVideos.push(videoid);
        await video.save();
        await user.save();

        return res.status(200).send({likes : video.likes, dislikes: video.dislikes});
    } catch (err) {
        return res.status(500).send({ error: 'An error occurred while updating the views', details: err.message });
    }
}

//This function Add Comments
export async function AddComment(req, res){
    const { text , videoid } = req.body;
    const { channelId } = req.user;
    try{
        const VideoData = await videoModel.findById(videoid);
        const newComment = {
            channelId : channelId,
            text : text
        }
        VideoData.comments.unshift(newComment);
        await VideoData.save();
        return res.send(VideoData.comments)
    }
    catch(err){
        return res.json({message : err.message});
    }
}

//This function Delete Comments
export async function DeleteComment(req, res){
    const { commentId , videoid} = req.body;
    const { channelId } = req.user;
    try{
        const VideoData = await videoModel.findById(videoid);
        const CommentInfo = VideoData.comments.find(x => x._id == commentId);
        if(!CommentInfo || CommentInfo.channelId !== channelId.toString()){
            throw new Error('Comment Not Found / Your are Not allowed to Delete');
        }
        const filteredComment =  VideoData.comments.filter(x => x._id.toString() !== commentId);
        VideoData.comments = filteredComment;
        await VideoData.save();
        return res.send(VideoData.comments);
    }
    catch(err){
        return res.json({message : err.message})
    }
}

//This function allows to Edit Comments
export async function EditComment(req, res){
    const { commentId , videoid , Updatetext } =req.body;
    const { channelId } = req.user;
    try{
        const VideoData = await videoModel.findById(videoid);
        const CommentInfo = VideoData.comments.find(x => x._id == commentId);
        if(!CommentInfo || CommentInfo.channelId !== channelId.toString()){
            throw new Error('Comment Not Found / Your are Not allowed to Delete');
        }
        if(CommentInfo.text == Updatetext){
            return res.json({message : 'No changes Required'});
        }
        CommentInfo.text = Updatetext;
        await VideoData.save()
        return res.json({text : Updatetext})

    }catch(err){
        return res.json({message : err.message})
    }

}

//This function Delete Stored Video
export async function DeleteVideo(req, res){
    const { videoid , channelid } = req.body;
    const { _id } = req.user;
    try{        
        const VideoInfo = await videoModel.findById(videoid);
        const ChannelInfo = await channelModel.findById(channelid);
        if(!VideoInfo || !ChannelInfo || ((ChannelInfo.userId.toString() && VideoInfo.userId) !== _id.toString() )){
            throw new Error("You Are not allowed to delete")
        }else{
            const filteredVideos = ChannelInfo.videos.filter(x => x.toString() !== videoid.toString());
            ChannelInfo.videos = filteredVideos;
            await ChannelInfo.save();
            await videoModel.findByIdAndDelete(videoid);
            return res.json({message : ChannelInfo.videos});
        }
    }catch(err){
        return res.json({message : err.message})
    }
}

//This function Edit Existing Video
export async function EditVideo(req, res){
    const { videoid, title, thumbnailUrl, description } = req.body;
    const { _id } = req.user;
    try{
        const VideoInfo = await videoModel.findById(videoid);
        if(!VideoInfo || VideoInfo.userId !== _id.toString()){
            throw new Error('Video Not Found / Your are not Allowed to Edit')
        }
        VideoInfo.title = title;
        VideoInfo.thumbnailUrl = thumbnailUrl;
        VideoInfo.description = description;
        await VideoInfo.save();
        return res.send(VideoInfo);
    }catch(err){
        return res.json({message : err.message})
    }
}