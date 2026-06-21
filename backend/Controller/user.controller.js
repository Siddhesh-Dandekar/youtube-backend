import userModel from "../Model/user.model.js";
import jwt from "jsonwebtoken";
import bcrypt from 'bcryptjs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LEN = 8;
const MAX_PASSWORD_LEN = 128;

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
            return res.status(200).json({ error: true, message: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        await new userModel({ username, email, password: hashedPassword }).save();
        return res.status(201).json({ error: false, message: 'Successfully Registered' });
    } catch (err) {
        console.error('registerUser error:', err);
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
        return res.status(200).json({ token: accesstoken });
    } catch (err) {
        console.error('loginUser error:', err);
        return res.status(500).json({ error: true, message: 'Server error' });
    }
}

export function fetchUser(req, res) {
    const { password, ...safe } = req.user.toObject ? req.user.toObject() : req.user;
    return res.status(200).json(safe);
}
