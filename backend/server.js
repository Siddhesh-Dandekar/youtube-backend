import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import userroutes from './Routes/user.routes.js';
import ChannelRoutes from './Routes/channel.routes.js';
import videoRoutes from './Routes/video.routes.js';
import libraryRoutes from './Routes/library.routes.js';
import logger from './utils/logger.js';

const requiredEnv = ['MONGO_URI', 'JWT_SECRET'];
if (process.env.NODE_ENV !== 'test') {
    for (const key of requiredEnv) {
        if (!process.env[key]) {
            logger.error(`Missing required env var: ${key}`);
            process.exit(1);
        }
    }
}

const PORT = process.env.PORT || 5100;
const corsOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
    origin: corsOrigins.length ? corsOrigins : false,
    credentials: true,
}));
app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => res.json({ name: 'youtube-clone-api', status: 'ok' }));
app.get('/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    res.status(dbState === 1 ? 200 : 503).json({
        status: dbState === 1 ? 'ok' : 'degraded',
        database: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown',
        uptime: process.uptime()
    });
});

userroutes(app);
ChannelRoutes(app);
videoRoutes(app);
libraryRoutes(app);

export async function connectDatabase(uri = process.env.MONGO_URI) {
    if (mongoose.connection.readyState === 1) return mongoose.connection;
    return mongoose.connect(uri);
}

export async function startServer() {
    try {
        await connectDatabase();
        logger.info('Connection successfully established');
        return app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
    } catch (err) {
        logger.error('Database connection failed', err);
        process.exit(1);
    }
}

if (process.env.NODE_ENV !== 'test') {
    startServer();
}

export default app;
