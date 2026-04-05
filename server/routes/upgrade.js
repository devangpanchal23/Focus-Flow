import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { requestUpgrade } from '../controllers/upgradeController.js';

const router = express.Router();

// User upgrade request (admin approval required)
router.post('/request', verifyToken, requestUpgrade);

export default router;

