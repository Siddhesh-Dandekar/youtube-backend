import {
    uploadvideo,
    fetchVideos,
    fetchVideoById,
    fetchTrending,
    fetchRecommendations,
    searchVideos,
    addViews,
    addLikes,
    addDislikes,
    AddComment,
    DeleteComment,
    EditComment,
    ReplyComment,
    ReactComment,
    DeleteVideo,
    EditVideo
} from "../Controller/video.controller.js";
import VerifyToken from "../Middleware/verifytoken.js";

function videoRoutes(app) {
    app.post('/upload', VerifyToken, uploadvideo);
    app.get('/videos', fetchVideos);
    app.get('/videos/trending', fetchTrending);
    app.get('/videos/recommendations', fetchRecommendations);
    app.get('/search/videos', searchVideos);
    app.get('/video/:id', fetchVideoById);
    app.post('/views/:videoid', addViews);
    app.post('/likes/:videoid', VerifyToken, addLikes);
    app.post('/dislikes/:videoid', VerifyToken, addDislikes);
    app.post('/comment', VerifyToken, AddComment);
    app.delete('/comment/delete', VerifyToken, DeleteComment);
    app.put('/comment/edit', VerifyToken, EditComment);
    app.post('/comment/reply', VerifyToken, ReplyComment);
    app.post('/comment/:videoid/:commentid/:reaction', VerifyToken, ReactComment);
    app.delete('/video/delete', VerifyToken, DeleteVideo);
    app.put('/video/edit', VerifyToken, EditVideo);
}

export default videoRoutes;
