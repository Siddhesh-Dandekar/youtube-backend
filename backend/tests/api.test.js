import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

let app;
let mongo;
let videoModel;
let channelModel;

async function signupAndLogin(email, username) {
    await request(app)
        .post('/signup')
        .send({ email, username, password: 'password123' })
        .expect(201);
    const login = await request(app)
        .post('/login')
        .send({ email, password: 'password123' })
        .expect(200);
    const token = login.body.token;
    const user = await request(app)
        .get('/validuser')
        .set('Authorization', `JWT ${token}`)
        .expect(200);
    return { token, user: user.body };
}

before(async () => {
    mongo = await MongoMemoryServer.create({
        binary: { version: '7.0.14' },
    });
    process.env.MONGO_URI = mongo.getUri();
    const serverModule = await import('../server.js');
    app = serverModule.default;
    await mongoose.connect(process.env.MONGO_URI);
    videoModel = (await import('../Model/video.model.js')).default;
    channelModel = (await import('../Model/channel.model.js')).default;
});

after(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    if (mongo) {
        await mongo.stop();
    }
});

test('auth, channel, subscription, search, likes, and library flows work together', async () => {
    const owner = await signupAndLogin('owner@example.com', 'Owner User');
    const viewer = await signupAndLogin('viewer@example.com', 'Viewer User');

    const channelResponse = await request(app)
        .post('/channel')
        .set('Authorization', `JWT ${owner.token}`)
        .send({ channelName: 'Owner Channel', description: 'Music and food videos' })
        .expect(201);
    const channelId = channelResponse.body.channelId;

    const video = await videoModel.create({
        title: 'Music Test Video',
        description: 'A searchable music video',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        userId: owner.user._id,
        channelId,
    });
    await channelModel.findByIdAndUpdate(channelId, { $push: { videos: video._id } });

    const feed = await request(app).get('/videos?q=music&limit=5').expect(200);
    assert.equal(feed.body.items.length, 1);
    assert.equal(feed.body.items[0].channel.channelName, 'Owner Channel');
    assert.equal(feed.body.hasMore, false);

    const subscription = await request(app)
        .post(`/channel/${channelId}/subscribe`)
        .set('Authorization', `JWT ${viewer.token}`)
        .expect(200);
    assert.equal(subscription.body.subscribed, true);
    assert.equal(subscription.body.subscribers, 1);

    const liked = await request(app)
        .post(`/likes/${video._id}`)
        .set('Authorization', `JWT ${viewer.token}`)
        .expect(200);
    assert.equal(liked.body.likes, 1);

    await request(app)
        .post(`/watch-later/${video._id}`)
        .set('Authorization', `JWT ${viewer.token}`)
        .expect(200);
    await request(app)
        .post(`/history/${video._id}`)
        .set('Authorization', `JWT ${viewer.token}`)
        .expect(200);

    const library = await request(app)
        .get('/library')
        .set('Authorization', `JWT ${viewer.token}`)
        .expect(200);
    assert.equal(library.body.watchLater[0].title, 'Music Test Video');
    assert.equal(library.body.history[0].video.title, 'Music Test Video');
    assert.equal(library.body.subscriptions[0].channelName, 'Owner Channel');
});
