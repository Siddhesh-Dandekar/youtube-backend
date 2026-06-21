import { uploadvideo, fetchVideos, fetchVideoById, addViews, addLikes, addDislikes, AddComment, DeleteComment, EditComment, DeleteVideo, EditVideo } from "../Controller/video.controller.js";
import VerifyToken from "../Middleware/verifytoken.js";

function videoRoutes(app) {
    app.post('/upload', VerifyToken, uploadvideo);
    app.get('/videos', fetchVideos);
    app.get('/video/:id', fetchVideoById);
    app.post('/views/:videoid', addViews);
    app.post('/likes/:videoid', VerifyToken, addLikes);
    app.post('/dislikes/:videoid', VerifyToken, addDislikes);
    app.post('/comment', VerifyToken, AddComment);
    app.delete('/comment/delete', VerifyToken, DeleteComment);
    app.put('/comment/edit', VerifyToken, EditComment);
    app.delete('/video/delete', VerifyToken, DeleteVideo);
    app.put('/video/edit', VerifyToken, EditVideo);
}

export default videoRoutes;
