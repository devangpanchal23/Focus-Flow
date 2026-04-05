import express from 'express';
import Payment from '../models/Payment.js';
import { verifyToken } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Middleware to check if admin
const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findOne({ userId: req.user.uid });
        if (user && user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ message: 'Access denied. Admin only.' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
};

router.get('/payments', verifyToken, isAdmin, async (req, res) => {
    try {
        const payments = await Payment.find().sort({ createdAt: -1 });
        res.json(payments);
    } catch (err) {
        console.error('Error fetching payments:', err);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

export default router;
