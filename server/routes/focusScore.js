import express from 'express';
import { calculateAndSaveFocusScore } from '../utils/scoreCalculator.js';
import UserFocusScore from '../models/UserFocusScore.js';
import { verifyToken } from '../middleware/auth.js';
import { checkFeatureAccess } from '../middleware/featureAccessMiddleware.js';
import { format, subDays } from 'date-fns';

const router = express.Router();

router.use(verifyToken);
router.use(checkFeatureAccess('analytics'));

// Get Score for a specific date (defaults to today)
// This triggers a fresh calculation to ensure real-time accuracy
router.get('/', async (req, res) => {
    try {
        const userId = req.user.uid;
        const dateStr = req.query.date || format(new Date(), 'yyyy-MM-dd');

        const score = await calculateAndSaveFocusScore(userId, dateStr);
        res.json(score);
    } catch (error) {
        console.error("Focus Score Error:", error);
        res.status(500).json({ message: error.message });
    }
});

// Get History (last 30 days)
router.get('/history', async (req, res) => {
    try {
        const userId = req.user.uid;
        const days = parseInt(req.query.days) || 30;

        // We don't recalculate history on every load, just fetch
        const scores = await UserFocusScore.find({ userId })
            .sort({ date: -1 })
            .limit(days);

        res.json(scores);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Leaderboard (Today's Top Scores)
router.get('/leaderboard', async (req, res) => {
    try {
        const dateStr = req.query.date || format(new Date(), 'yyyy-MM-dd');

        // Find top 10 scores for today
        // We probably also want User details (name, email).
        // Since we store userId, we can aggregate or populate if we had refs.
        // For now, simpler: fetch scores, then fetch users or store snapshot.
        // Actually, UserFocusScore schema only has userId.

        const topScores = await UserFocusScore.find({ date: dateStr })
            .sort({ finalFocusScore: -1 })
            .limit(20);

        // Manually merge user info? Or just return userId and let frontend fetch?
        // Let's assume frontend can handle it or we do a quick lookup if User model is available.
        // Importing User model here.

        res.json(topScores);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
