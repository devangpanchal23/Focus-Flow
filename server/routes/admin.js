import express from 'express';
import Admin from '../models/Admin.js';
import { verifyToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { logActivity } from '../middleware/activityLogger.js';

import { getDashboardStats } from '../controllers/adminDashboardController.js';
import { getUsers, getUserDetails, blockUser, unblockUser, deleteUser, approveUser, declineUser } from '../controllers/adminUserController.js';
import { getLogs } from '../controllers/activityLogController.js';
import { createNotification } from '../controllers/notificationController.js';
import { getUpgradeRequests, approveUpgrade, rejectUpgrade } from '../controllers/upgradeController.js';
import { getTopTaskPerformers } from '../controllers/adminAnalyticsController.js';
import { getPayments } from '../controllers/adminPaymentController.js';

const router = express.Router();

// Admin Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Check against DB
        let adminUser = await Admin.findOne({ email });

        // Backup hardcoded: admin@blitzit.com / admin123
        if (!adminUser && email === 'admin@blitzit.com' && password === 'admin123') {
            adminUser = new Admin({ email, password });
            await adminUser.save();
        } else if (!adminUser) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (adminUser.password !== password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // We use Admin email as ID for logging since Admin collection doesn't have a rigid structure here
        await logActivity('ADMIN_SYSTEM', 'LOGIN', adminUser.email, req.ip);

        res.json({ message: 'Login successful', admin: { email: adminUser.email } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// All routes below this require a valid JWT AND the 'admin' role
router.use(verifyToken, requireRole('admin'));

// 1. Dashboard Analytics
router.get('/stats', getDashboardStats);
router.get('/analytics/top-task-performers', getTopTaskPerformers);

// 2. Advanced User Management
router.get('/users/pending', (req, res) => {
    // Spec-required endpoint: list users awaiting approval
    req.query.status = 'pending';
    return getUsers(req, res);
});
router.get('/users', getUsers);
router.get('/users/:id/details', getUserDetails);
router.patch('/users/:id/approve', approveUser);
router.patch('/users/:id/decline', declineUser);
router.patch('/users/:id/block', blockUser);
router.patch('/users/:id/unblock', unblockUser);
router.delete('/users/:id', deleteUser);

// 3. Activity Logs
router.get('/logs', getLogs);

// 4. Notifications System
router.post('/notifications', createNotification);

// 5. Upgrade Requests
router.get('/upgrade-requests', getUpgradeRequests);
router.patch('/upgrade-requests/:id/approve', approveUpgrade);
router.patch('/upgrade-requests/:id/reject', rejectUpgrade);

// 6. Payments Tracking
router.get('/payments', getPayments);

export default router;
