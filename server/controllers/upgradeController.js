import UpgradeRequest from '../models/UpgradeRequest.js';
import User from '../models/User.js';

// User requests an upgrade
export const requestUpgrade = async (req, res) => {
    try {
        const { requestedRole } = req.body;
        // req.user is set by verifyToken middleware which maps user_id to uid, but let's fetch full user Context
        const user = await User.findOne({ userId: req.user.uid });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!['pro', 'full'].includes(requestedRole)) {
            return res.status(400).json({ message: 'Invalid requested role' });
        }

        // Only allow request if current role is less than requested
        if (user.role === 'full' || (user.role === 'pro' && requestedRole === 'pro')) {
            return res.status(400).json({ message: `You already have ${user.role} access.` });
        }
        
        // Prevent duplicate pending requests
        const existingRequest = await UpgradeRequest.findOne({
            userId: user._id,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({ message: 'You already have a pending upgrade request.' });
        }

        const newRequest = new UpgradeRequest({
            userId: user._id,
            requestedRole
        });

        await newRequest.save();

        res.status(201).json({ message: 'Upgrade request sent to admin for approval.', request: newRequest });
    } catch (error) {
        console.error('Upgrade request error:', error);
        res.status(500).json({ message: 'Server error processing upgrade request' });
    }
};

// Admin gets all upgrade requests
export const getUpgradeRequests = async (req, res) => {
    try {
        const requests = await UpgradeRequest.find()
            .populate('userId', 'email displayName role')
            .sort({ createdAt: -1 });
        
        res.json({ requests });
    } catch (error) {
        console.error('Fetch upgrade requests error:', error);
        res.status(500).json({ message: 'Server error fetching upgrade requests' });
    }
};

// Admin approves request
export const approveUpgrade = async (req, res) => {
    try {
        const { id } = req.params;
        const upgradeReq = await UpgradeRequest.findById(id).populate('userId');

        if (!upgradeReq) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (upgradeReq.status !== 'pending') {
            return res.status(400).json({ message: `Request is already ${upgradeReq.status}` });
        }

        // Update Request Status
        upgradeReq.status = 'approved';
        await upgradeReq.save();

        // Update User Role
        const user = await User.findById(upgradeReq.userId._id);
        user.role = upgradeReq.requestedRole;
        await user.save();

        res.json({ message: `Upgrade to ${upgradeReq.requestedRole} approved.`, request: upgradeReq });
    } catch (error) {
        console.error('Approve upgrade error:', error);
        res.status(500).json({ message: 'Server error approving upgrade' });
    }
};

// Admin rejects request
export const rejectUpgrade = async (req, res) => {
    try {
        const { id } = req.params;
        const upgradeReq = await UpgradeRequest.findById(id);

        if (!upgradeReq) {
            return res.status(404).json({ message: 'Request not found' });
        }

        if (upgradeReq.status !== 'pending') {
            return res.status(400).json({ message: `Request is already ${upgradeReq.status}` });
        }

        // Update Request Status
        upgradeReq.status = 'rejected';
        await upgradeReq.save();

        res.json({ message: 'Upgrade request rejected.', request: upgradeReq });
    } catch (error) {
        console.error('Reject upgrade error:', error);
        res.status(500).json({ message: 'Server error rejecting upgrade' });
    }
};
