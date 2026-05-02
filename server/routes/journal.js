import express from 'express';
import JournalEntry from '../models/JournalEntry.js';
import { verifyToken } from '../middleware/auth.js';
import { checkFeatureAccess } from '../middleware/featureAccessMiddleware.js';

const router = express.Router();

router.use(verifyToken);
router.use(checkFeatureAccess('journal'));

// Get all entries for user
router.get('/', async (req, res) => {
    try {
        const entries = await JournalEntry.find({ userId: req.user.uid })
            .sort({ date: -1 })
            .select('date content mood createdAt');
        res.json(entries);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get entry for specific date
router.get('/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const entry = await JournalEntry.findOne({
            userId: req.user.uid,
            date
        });

        if (!entry) {
            return res.json({ content: '', date });
        }
        res.json(entry);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create or Update entry
router.post('/', async (req, res) => {
    try {
        const { date, content } = req.body;
        console.log(`[Journal] Saving entry for user ${req.user.uid} on date ${date}`);

        if (!date) return res.status(400).json({ message: 'Date is required' });

        // upsert: true creates the document if it doesn't exist
        // new: true returns the modified document rather than the original
        // setDefaultsOnInsert: true ensures default values (like createdAt) are applied on creation
        const entry = await JournalEntry.findOneAndUpdate(
            { userId: req.user.uid, date },
            {
                content,
                updatedAt: new Date(),
                $setOnInsert: { createdAt: new Date() }
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        console.log(`[Journal] Successfully saved entry for ${date}`);
        res.json(entry);
    } catch (err) {
        console.error('[Journal] Save Error:', err);
        res.status(400).json({ message: err.message });
    }
});

export default router;
