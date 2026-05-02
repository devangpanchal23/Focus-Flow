import express from 'express';
import { createOrder, verifyPayment, getMyPaymentReceipts } from '../controllers/paymentController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/create-order', verifyToken, createOrder);
router.post('/verify', verifyToken, verifyPayment);
router.get('/history', verifyToken, getMyPaymentReceipts);

export default router;
