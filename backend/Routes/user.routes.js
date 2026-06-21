import { registerUser, loginUser, fetchUser } from "../Controller/user.controller.js";
import VerifyToken from "../Middleware/verifytoken.js";
import rateLimit from "express-rate-limit";

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: true, message: 'Too many login attempts, try again later' },
});

const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: true, message: 'Too many signup attempts, try again later' },
});

function userroutes(app) {
    app.post('/signup', signupLimiter, registerUser);
    app.post('/login', loginLimiter, loginUser);
    app.get('/validuser', VerifyToken, fetchUser);
}

export default userroutes;
