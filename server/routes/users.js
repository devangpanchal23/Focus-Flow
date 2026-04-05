import express from 'express';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

import { getUserNotifications } from '../controllers/notificationController.js';

const router = express.Router();

router.use(verifyToken);

// Sync user data (Create or Update)
router.post('/sync', async (req, res) => {
    try {
        const { email, displayName, photoURL } = req.body;

        const user = await User.findOneAndUpdate(
            { userId: req.user.uid },
            {
                userId: req.user.uid,
                email,
                displayName,
                photoURL
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json(user);
    } catch (err) {
        console.error('Error syncing user:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get current user profile
router.get('/me', async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.user.uid });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Notifications
router.get('/notifications', getUserNotifications);

export default router;
