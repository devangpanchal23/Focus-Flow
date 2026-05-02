import Notification from '../models/Notification.js';
import NotificationWorker from '../services/NotificationWorker.js';

// Admin: Create Notification
export const createNotification = async (req, res) => {
    try {
        const { title, message, recipientType, userId, type } = req.body;

        if (recipientType === 'USER' && !userId) {
            return res.status(400).json({ message: 'User ID required for USER-targeted notifications' });
        }

        const notification = new Notification({
            title,
            message,
            type: type || 'SYSTEM',
            userId: recipientType === 'ALL' ? 'ALL' : userId,
            status: 'UNREAD'
        });

        await notification.save();

        if (recipientType === 'USER') {
            // Push to specific user
            NotificationWorker.pushToUser(userId, { type: 'NEW_NOTIFICATION', notification });
        } else {
            // Push to all connected clients
            for (const [uid, _] of NotificationWorker.clients.entries()) {
                NotificationWorker.pushToUser(uid, { type: 'NEW_NOTIFICATION', notification });
            }
        }

        res.status(201).json({ message: 'Notification created successfully', notification });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 1. Establish SSE Connection for Real-time push
export const streamNotifications = (req, res) => {
    // SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Register this connection to the Notification Worker
    NotificationWorker.addClient(req.user.uid, res);

    // Send initial ping to keep connection alive
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE connection established' })}\n\n`);
};

// 2. Fetch Active Notifications
export const getUserNotifications = async (req, res) => {
    try {
        const { status } = req.query; // optional filter
        
        let query = { 
            userId: req.user.uid,
            status: { $nin: ['DELETED', 'DISMISSED'] } // By default, only show active
        };

        if (status) {
            query.status = status;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(20);

        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 3. Mark Notification as Read
export const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.uid },
            { status: 'READ' },
            { new: true }
        );
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 4. Mark All as Read
export const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user.uid, status: 'UNREAD' },
            { status: 'READ' }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 5. Dismiss a Notification (hide from main view but keep history)
export const dismissNotification = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.uid },
            { status: 'DISMISSED' },
            { new: true }
        );
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 6. Delete Notification (Soft or hard delete, going with soft delete here)
export const deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.uid },
            { status: 'DELETED' },
            { new: true }
        );
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        res.json({ message: 'Notification deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 7. Perform Action attached to notification
export const actOnNotification = async (req, res) => {
    try {
        const notification = await Notification.findOne({ _id: req.params.id, userId: req.user.uid });
        
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        if (notification.action.type === 'NONE') return res.status(400).json({ message: 'No action associated' });

        // Logic depending on action type
        if (notification.action.type === 'CLAIM_REWARD') {
            // e.g. await RewardService.claim(req.user.uid, notification.action.linkId);
            notification.status = 'DISMISSED'; // Dismiss after claiming
            await notification.save();
            return res.json({ message: 'Reward claimed successfully!', notification });
        }

        res.status(400).json({ message: 'Unknown action type' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
