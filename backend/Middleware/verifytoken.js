import userModel from "../Model/user.model.js";
import mongoose from "mongoose";
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

function VerifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: true, message: 'Access Denied' });
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'JWT') {
        return res.status(401).json({ error: true, message: 'Access Denied' });
    }
    jwt.verify(parts[1], process.env.JWT_SECRET, function(err, verifiedtoken) {
        if (err || !verifiedtoken) {
            return res.status(401).json({ error: true, message: 'Invalid or expired token' });
        }
        const userId = String(verifiedtoken.userId || '');
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(401).json({ error: true, message: 'Invalid token' });
        }
        userModel.findById(userId)
            .then(data => {
                if (!data) {
                    return res.status(401).json({ error: true, message: 'User not found' });
                }
                req.user = data;
                next();
            })
            .catch(err => {
                logger.error('VerifyToken DB error', err);
                return res.status(500).json({ error: true, message: 'Server error' });
            });
    });
}

export default VerifyToken;
