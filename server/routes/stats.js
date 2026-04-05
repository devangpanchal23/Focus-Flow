import express from 'express';
import DailyStats from '../models/DailyStats.js';

import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

// Get history (last 30 days)
router.get('/history', async (req, res) => {
    try {
        // Fetch all stats and sort by date ascending
        // In a real app, you might limit this to the last 30 days using a date query
        const stats = await DailyStats.find({ userId: req.user.uid }).sort({ date: 1 }).limit(30);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
