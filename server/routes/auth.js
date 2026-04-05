import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';

const router = express.Router();

// Helper to generate JWT
const generateToken = (userId) => {
    return jwt.sign({ user_id: userId }, process.env.JWT_SECRET || 'fallback_secret_key', {
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
            password: hashedPassword,
            displayName: name || normalizedEmail.split('@')[0],
            role: isAdmin ? 'admin' : 'normal',
            status: isAdmin ? 'accepted' : 'pending'
        });

        await newUser.save();

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
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Verify password
        if (!user.password) {
            return res.status(401).json({ message: 'Invalid credentials. User might have been registered via another method without a password.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

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

        // Generate token
        const token = generateToken(user.userId);

        res.json({
            message: 'Login successful',
            token,
            user: {
                uid: user.userId,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: user.role,
                status: user.status,
                isPremium: user.isPremium,
                hasPro: user.hasPro,
                hasFullAccess: user.hasFullAccess
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Verify / Get Current User
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');

        const user = await User.findOne({ userId: decoded.user_id }).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            user: {
                uid: user.userId,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: user.role,
                status: user.status,
                isPremium: user.isPremium,
                hasPro: user.hasPro,
                hasFullAccess: user.hasFullAccess
            }
        });
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

        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: 'Password reset successful. You can now login.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error resetting password' });
    }
});

export default router;
