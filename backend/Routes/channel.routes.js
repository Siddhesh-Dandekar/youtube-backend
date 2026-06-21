import {
    createChannel,
    fetchChannel,
    fetchChannelVideos,
    updateChannel,
    toggleSubscription,
    subscriptionStatus
} from "../Controller/channel.controller.js";
import VerifyToken from "../Middleware/verifytoken.js";

function ChannelRoutes(app) {
    app.get('/channel/:id', fetchChannel);
    app.get('/channel/:id/videos', fetchChannelVideos);
    app.post('/channel', VerifyToken, createChannel);
    app.post('/channel/update', VerifyToken, updateChannel);
    app.get('/channel/:id/subscription', VerifyToken, subscriptionStatus);
    app.post('/channel/:id/subscribe', VerifyToken, toggleSubscription);
}

export default ChannelRoutes;
