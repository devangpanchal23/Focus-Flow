import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
    streamNotifications,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    deleteNotification,
    actOnNotification
} from '../controllers/notificationController.js';

const router = express.Router();

// Apply authentication middleware to all notification routes
router.use(verifyToken);

// Real-time SSE connection
router.get('/stream', streamNotifications);

// CRUD and State Endpoints
router.get('/', getUserNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.patch('/:id/dismiss', dismissNotification);
router.delete('/:id', deleteNotification);

// Action Execution
router.post('/:id/act', actOnNotification);

export default router;
