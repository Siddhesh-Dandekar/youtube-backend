import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import userroutes from './Routes/user.routes.js';
import ChannelRoutes from './Routes/channel.routes.js';
import videoRoutes from './Routes/video.routes.js';

const requiredEnv = ['MONGO_URI', 'JWT_SECRET'];
for (const key of requiredEnv) {
    if (!process.env[key]) {
        console.error(`Missing required env var: ${key}`);
        process.exit(1);
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

app.get('/', (req, res) => res.send('hello'));

userroutes(app);
ChannelRoutes(app);
videoRoutes(app);

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connection successfully established');
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    });
