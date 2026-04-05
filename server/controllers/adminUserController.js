import User from '../models/User.js';
import Task from '../models/Task.js';
import DailyStats from '../models/DailyStats.js';
import Habit from '../models/Habit.js';
import Song from '../models/Song.js';
import BlockedWebsite from '../models/BlockedWebsite.js';
import { logActivity } from '../middleware/activityLogger.js';

export const getUsers = async (req, res) => {
    try {
        const { search = '', status = '' } = req.query;
        let query = {};
        
        if (search) {
            query.$or = [
                { email: { $regex: search, $options: 'i' } },
                { name: { $regex: search, $options: 'i' } },
                { displayName: { $regex: search, $options: 'i' } }
            ];
        }

        if (status === 'blocked') query.isBlocked = true;
        if (status === 'active') query.isBlocked = false;
        
        // Handle new generic status queries
        if (['pending', 'accepted', 'declined'].includes(status)) {
            query.status = status;
        }

        const users = await User.find(query).sort({ createdAt: -1 });
        
        // Exclude passwords
        const sanitizedUsers = users.map(u => {
            const userObj = u.toObject();
            delete userObj.password;
            return userObj;
        });

        res.json({ users: sanitizedUsers });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const approveUser = async (req, res) => {
    try {
        const user = await User.findOneAndUpdate(
            { userId: req.params.id }, 
            { status: 'accepted' }, 
            { new: true }
        );
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        await logActivity('SYSTEM', 'APPROVE_USER', req.user?.uid || 'admin', req.ip, { targetUser: user.email });
        
        res.json({ message: 'User approved successfully', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const declineUser = async (req, res) => {
    try {
        const user = await User.findOneAndUpdate(
            { userId: req.params.id }, 
            { status: 'declined' }, 
            { new: true }
        );
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        await logActivity('SYSTEM', 'DECLINE_USER', req.user?.uid || 'admin', req.ip, { targetUser: user.email });
        
        res.json({ message: 'User declined successfully', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getUserDetails = async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.params.id }).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        const taskCount = await Task.countDocuments({ userId: user.userId });
        const completedTaskCount = await Task.countDocuments({ userId: user.userId, completed: true });
        
        res.json({ user, stats: { taskCount, completedTaskCount } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const blockUser = async (req, res) => {
    try {
        const user = await User.findOneAndUpdate({ userId: req.params.id }, { isBlocked: true }, { new: true });
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        await logActivity(user.userId, 'BLOCK_USER', req.adminUser.userId, req.ip);
        
        res.json({ message: 'User blocked successfully', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const unblockUser = async (req, res) => {
    try {
        const user = await User.findOneAndUpdate({ userId: req.params.id }, { isBlocked: false }, { new: true });
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        await logActivity(user.userId, 'UNBLOCK_USER', req.adminUser.userId, req.ip);

        res.json({ message: 'User unblocked successfully', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findOneAndDelete({ userId: id });

        await Promise.all([
            Task.deleteMany({ userId: id }),
            DailyStats.deleteMany({ userId: id }),
            Habit.deleteMany({ userId: id }),
            Song.deleteMany({ userId: id }),
            BlockedWebsite.deleteMany({ userId: id })
        ]);

        await logActivity(id, 'DELETE_USER', req.adminUser.userId, req.ip, { deletedEmail: user?.email });

        res.json({ message: 'User data wiped successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
