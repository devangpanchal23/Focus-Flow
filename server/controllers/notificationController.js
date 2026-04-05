import Notification from '../models/Notification.js';

export const createNotification = async (req, res) => {
    try {
        const { title, message, recipientType, userId } = req.body;

        if (recipientType === 'USER' && !userId) {
            return res.status(400).json({ message: 'User ID required for USER-targeted notifications' });
        }

        const notification = new Notification({
            title,
            message,
            recipientType,
            userId
        });

        await notification.save();
        res.status(201).json({ message: 'Notification created successfully', notification });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getUserNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({
            $or: [
                { recipientType: 'ALL' },
                { recipientType: 'USER', userId: req.user.uid }
            ]
        }).sort({ createdAt: -1 }).limit(20);

        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
