import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';
import AuthProvider from '../models/AuthProvider.js';
import LoginLogbook from '../models/LoginLogbook.js';
import { verifyToken } from '../middleware/auth.js';
import { toPublicUser } from '../utils/userPublic.js';

const router = express.Router();

const generateToken = (user) => {
    const uid = typeof user === 'string' ? user : user.userId;
    const payload = {
        user_id: uid,
        planType: typeof user === 'string' ? 'free' : user.planType || 'free',
    };
    if (typeof user !== 'string' && user.planExpiry) {
        payload.planExpiry = user.planExpiry.getTime ? user.planExpiry.getTime() : user.planExpiry;
    }
    return jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret_key', {
        expiresIn: '7d',
    });
};

// Signup Route
router.post('/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ message: 'Invalid input format' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if user already exists
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with that email' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userId = uuidv4(); // Generate a unique userId replacing firebase uid

        const isAdmin = normalizedEmail === 'admin@focusflow.com';

        // Create new user
        const newUser = new User({
            userId,
            email: normalizedEmail,
            displayName: name || normalizedEmail.split('@')[0],
            role: isAdmin ? 'admin' : 'normal',
            status: isAdmin ? 'accepted' : 'pending'
        });

        await newUser.save();

        // Create AuthProvider for local auth
        const authProvider = new AuthProvider({
            userId: newUser._id,
            provider: 'local',
            providerId: normalizedEmail,
            credentials: hashedPassword
        });

        await authProvider.save();

        res.status(201).json({
            message: 'Account created successfully. Please wait for admin approval.',
            user: {
                uid: newUser.userId,
                email: newUser.email,
                displayName: newUser.displayName,
                status: newUser.status,
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'User already exists with that email' });
        }
        res.status(500).json({ message: 'Server error during signup' });
    }
});

// Login Route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        if (typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ message: 'Invalid input format' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if user exists
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            await LoginLogbook.create({ provider: 'local', ipAddress: req.ip, userAgent: req.headers['user-agent'], status: 'Failed_No_User' });
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Verify password from AuthProvider
        const authProvider = await AuthProvider.findOne({ userId: user._id, provider: 'local' });
        if (!authProvider || !authProvider.credentials) {
            await LoginLogbook.create({ userId: user._id, provider: 'local', ipAddress: req.ip, userAgent: req.headers['user-agent'], status: 'Failed_Invalid_Creds' });
            return res.status(401).json({ message: 'Invalid credentials. User might have been registered via another method without a password.' });
        }

        const isMatch = await bcrypt.compare(password, authProvider.credentials);
        if (!isMatch) {
            await LoginLogbook.create({ userId: user._id, provider: 'local', ipAddress: req.ip, userAgent: req.headers['user-agent'], status: 'Failed_Invalid_Creds' });
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        await LoginLogbook.create({ userId: user._id, provider: 'local', ipAddress: req.ip, userAgent: req.headers['user-agent'], status: 'Success' });

        const isAdminEmail = normalizedEmail === 'admin@focusflow.com';

        // Auto-correct admin role/status if it's out of sync
        if (isAdminEmail && (user.role !== 'admin' || user.status !== 'accepted')) {
            user.role = 'admin';
            user.status = 'accepted';
            await user.save();
        }

        if (user.status === "pending" && user.role !== "admin") {
            return res.status(403).json({ message: "Account under admin review" });
        }

        if (user.status === "declined" && user.role !== "admin") {
            return res.status(403).json({ message: "Account rejected by admin" });
        }

        const token = generateToken(user);

        res.json({
            message: 'Login successful',
            token,
            user: toPublicUser(user),
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Verify / Get Current User
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.user.uid }).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user: toPublicUser(user) });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ message: 'Invalid token' });
    }
});

// Reset Password Route
router.post('/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        if (!email || !newPassword) {
            return res.status(400).json({ message: 'Email and new password are required' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({ message: 'User not found with this email' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const authProvider = await AuthProvider.findOne({ userId: user._id, provider: 'local' });
        if (authProvider) {
            authProvider.credentials = hashedPassword;
            await authProvider.save();
        } else {
            // If they didn't have a local provider, create one
            await AuthProvider.create({
                userId: user._id,
                provider: 'local',
                providerId: normalizedEmail,
                credentials: hashedPassword
            });
        }

        res.status(200).json({ message: 'Password reset successful. You can now login.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error resetting password' });
    }
});

export default router;
