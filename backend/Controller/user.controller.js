import userModel from "../Model/user.model.js";
import jwt from "jsonwebtoken";
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import logger from '../utils/logger.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LEN = 8;
const MAX_PASSWORD_LEN = 128;

const token = () => crypto.randomBytes(24).toString('hex');

export const toSafeUser = (user) => {
    const source = user?.toObject ? user.toObject() : user;
    if (!source) return null;
    const safe = { ...source };
    delete safe.password;
    delete safe.emailVerificationToken;
    delete safe.passwordResetToken;
    delete safe.passwordResetExpires;
    return safe;
};

export async function registerUser(req, res) {
    try {
        const username = String(req.body.username || '').trim();
        const email = String(req.body.email || '').trim().toLowerCase();
        const password = String(req.body.password || '');

        if (!username || username.length > 60) {
            return res.status(400).json({ error: true, message: 'Invalid username' });
        }
        if (!EMAIL_RE.test(email)) {
            return res.status(400).json({ error: true, message: 'Invalid email' });
        }
        if (password.length < MIN_PASSWORD_LEN || password.length > MAX_PASSWORD_LEN) {
            return res.status(400).json({ error: true, message: `Password must be ${MIN_PASSWORD_LEN}-${MAX_PASSWORD_LEN} characters` });
        }

        const existing = await userModel.findOne({ email });
        if (existing) {
            return res.status(409).json({ error: true, message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const verificationToken = token();
        await new userModel({
            username,
            email,
            password: hashedPassword,
            emailVerificationToken: verificationToken
        }).save();
        return res.status(201).json({
            error: false,
            message: 'Successfully registered',
            verificationToken
        });
    } catch (err) {
        logger.error('registerUser error', err);
        return res.status(500).json({ error: true, message: 'Server error' });
    }
}

export async function loginUser(req, res) {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const password = String(req.body.password || '');

        if (!email || !password) {
            return res.status(400).json({ error: true, message: 'Email and password required' });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: true, message: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: true, message: 'Invalid credentials' });
        }

        const accesstoken = jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '2h' });
        return res.status(200).json({ token: accesstoken, user: toSafeUser(user) });
    } catch (err) {
        logger.error('loginUser error', err);
        return res.status(500).json({ error: true, message: 'Server error' });
    }
}

export function fetchUser(req, res) {
    return res.status(200).json(toSafeUser(req.user));
}

export async function requestPasswordReset(req, res) {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        if (!EMAIL_RE.test(email)) {
            return res.status(400).json({ error: true, message: 'Invalid email' });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(200).json({ error: false, message: 'If the account exists, reset instructions are available.' });
        }

        user.passwordResetToken = token();
        user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
        await user.save();

        return res.status(200).json({
            error: false,
            message: 'Use this reset token to choose a new password.',
            resetToken: user.passwordResetToken
        });
    } catch (err) {
        logger.error('requestPasswordReset error', err);
        return res.status(500).json({ error: true, message: 'Server error' });
    }
}

export async function resetPassword(req, res) {
    try {
        const resetToken = String(req.body.token || '').trim();
        const password = String(req.body.password || '');
        if (!resetToken) {
            return res.status(400).json({ error: true, message: 'Reset token required' });
        }
        if (password.length < MIN_PASSWORD_LEN || password.length > MAX_PASSWORD_LEN) {
            return res.status(400).json({ error: true, message: `Password must be ${MIN_PASSWORD_LEN}-${MAX_PASSWORD_LEN} characters` });
        }

        const user = await userModel.findOne({
            passwordResetToken: resetToken,
            passwordResetExpires: { $gt: new Date() }
        });
        if (!user) {
            return res.status(400).json({ error: true, message: 'Invalid or expired reset token' });
        }

        user.password = await bcrypt.hash(password, 12);
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await user.save();
        return res.status(200).json({ error: false, message: 'Password updated' });
    } catch (err) {
        logger.error('resetPassword error', err);
        return res.status(500).json({ error: true, message: 'Server error' });
    }
}

export async function verifyEmail(req, res) {
    try {
        const verificationToken = String(req.body.token || req.params.token || '').trim();
        if (!verificationToken) {
            return res.status(400).json({ error: true, message: 'Verification token required' });
        }
        const user = await userModel.findOne({ emailVerificationToken: verificationToken });
        if (!user) {
            return res.status(400).json({ error: true, message: 'Invalid verification token' });
        }
        user.emailVerified = true;
        user.emailVerificationToken = null;
        await user.save();
        return res.status(200).json({ error: false, message: 'Email verified' });
    } catch (err) {
        logger.error('verifyEmail error', err);
        return res.status(500).json({ error: true, message: 'Server error' });
    }
}

export async function resendEmailVerification(req, res) {
    try {
        const { _id } = req.user;
        const user = await userModel.findById(_id);
        if (!user) {
            return res.status(401).json({ error: true, message: 'User not found' });
        }
        if (user.emailVerified) {
            return res.status(200).json({ error: false, message: 'Email already verified' });
        }
        user.emailVerificationToken = token();
        await user.save();
        return res.status(200).json({
            error: false,
            message: 'Use this token to verify your email.',
            verificationToken: user.emailVerificationToken
        });
    } catch (err) {
        logger.error('resendEmailVerification error', err);
        return res.status(500).json({ error: true, message: 'Server error' });
    }
}
