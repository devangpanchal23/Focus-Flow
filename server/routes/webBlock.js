import express from 'express';
import BlockedWebsite from '../models/BlockedWebsite.js';
import { verifyToken } from '../middleware/auth.js';
import { checkFeatureAccess } from '../middleware/featureAccessMiddleware.js';

const router = express.Router();

// Apply auth middleware
router.use(verifyToken);
router.use(checkFeatureAccess('webblock'));

// Helper to clean domain
const cleanDomain = (input) => {
    if (!input) return '';
    let domain = input.toLowerCase().trim();

    // Remove protocol
    domain = domain.replace(/^(https?:\/\/)/, '');

    // Remove unwanted path/query
    domain = domain.split('/')[0];

    // Remove www.
    domain = domain.replace(/^www\./, '');

    return domain;
};

// Get all blocked websites
router.get('/', async (req, res) => {
    try {
        const sites = await BlockedWebsite.find({ userId: req.user.uid }).sort({ createdAt: -1 });
        res.json(sites);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add a blocked website
router.post('/', async (req, res) => {
    try {
        const rawDomain = req.body.domain;
        if (!rawDomain) {
            return res.status(400).json({ message: 'Domain is required' });
        }

        const domain = cleanDomain(rawDomain);

        if (!domain) {
            return res.status(400).json({ message: 'Invalid domain format' });
        }

        // Check if already exists for this user
        const existing = await BlockedWebsite.findOne({
            userId: req.user.uid,
            domain: domain
        });

        if (existing) {
            return res.status(409).json({ message: 'Website is already blocked' });
        }

        const newBlock = new BlockedWebsite({
            userId: req.user.uid,
            domain: domain
        });

        const savedBlock = await newBlock.save();
        res.status(201).json(savedBlock);

    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: 'Website is already blocked' });
        }
        res.status(400).json({ message: err.message });
    }
});

// Remove a blocked website
router.delete('/:id', async (req, res) => {
    try {
        const block = await BlockedWebsite.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.uid
        });

        if (!block) {
            return res.status(404).json({ message: 'Blocked website not found' });
        }

        res.json({ message: 'Unblocked successfully', id: block._id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
