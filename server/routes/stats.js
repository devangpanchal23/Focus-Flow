import express from 'express';
import DailyStats from '../models/DailyStats.js';

import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyToken);

// Get history (last 30 days)
router.get('/history', async (req, res) => {
    try {
        const requestedDays = Number.parseInt(req.query.days, 10);
        const days = Number.isFinite(requestedDays)
            ? Math.max(1, Math.min(requestedDays, 365))
            : 30;

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - (days - 1));
        const cutoffDate = cutoff.toISOString().slice(0, 10);

        const stats = await DailyStats.find({
            userId: req.user.uid,
            date: { $gte: cutoffDate },
        })
            .sort({ date: 1 })
            .limit(days + 5);
        res.json(stats);
    } catch (err) {
        console.error('[stats] history failed', { userId: req.user?.uid, error: err.message });
        res.status(500).json({ message: err.message });
    }
});

export default router;
