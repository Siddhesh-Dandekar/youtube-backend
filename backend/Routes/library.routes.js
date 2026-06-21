import VerifyToken from "../Middleware/verifytoken.js";
import {
    getLibrary,
    addHistory,
    clearHistory,
    toggleWatchLater,
    getNotifications,
    markNotificationRead,
    getPlaylists,
    createPlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist
} from "../Controller/library.controller.js";

function libraryRoutes(app) {
    app.get('/library', VerifyToken, getLibrary);
    app.post('/history/:videoid', VerifyToken, addHistory);
    app.delete('/history', VerifyToken, clearHistory);
    app.post('/watch-later/:videoid', VerifyToken, toggleWatchLater);
    app.get('/notifications', VerifyToken, getNotifications);
    app.post('/notifications/:id/read', VerifyToken, markNotificationRead);
    app.get('/playlists', VerifyToken, getPlaylists);
    app.post('/playlists', VerifyToken, createPlaylist);
    app.post('/playlists/:id/videos/:videoid', VerifyToken, addVideoToPlaylist);
    app.delete('/playlists/:id/videos/:videoid', VerifyToken, removeVideoFromPlaylist);
    app.delete('/playlists/:id', VerifyToken, deletePlaylist);
}

export default libraryRoutes;
