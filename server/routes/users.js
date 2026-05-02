import express from 'express';
import User from '../models/User.js';
import DailyStats from '../models/DailyStats.js';
import { verifyToken } from '../middleware/auth.js';

import { getUserNotifications } from '../controllers/notificationController.js';
import { getMeWithState, patchUserState, logUserSession } from '../controllers/userDataController.js';

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

        try {
            const identityUpdate = {};
            if (email) identityUpdate.userEmail = email;
            if (displayName) identityUpdate.userDisplayName = displayName;
            if (Object.keys(identityUpdate).length > 0) {
                await DailyStats.updateMany(
                    { userId: req.user.uid },
                    { $set: identityUpdate }
                );
            }
        } catch (statsErr) {
            console.error('Failed to backfill daily stats identity:', statsErr);
        }

        res.json(user);
    } catch (err) {
        console.error('Error syncing user:', err);
        res.status(500).json({ message: err.message });
    }
});

// Profile + persisted preferences/uiState for MongoDB / Compass parity
router.get('/me', getMeWithState);
router.patch('/state', patchUserState);
router.post('/session', logUserSession);

// Notifications
router.get('/notifications', getUserNotifications);

export default router;
