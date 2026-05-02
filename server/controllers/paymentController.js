import Razorpay from 'razorpay';
import crypto from 'crypto';
import { activatePlanFromPayment } from '../services/paymentActivation.js';
import { razorpayPaymentReceiptSnapshot } from '../utils/razorpayReceiptFields.js';
import { toPublicUser } from '../utils/userPublic.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import dotenv from 'dotenv';

dotenv.config();

export const createOrder = async (req, res) => {
    try {
        const { mode } = req.body;
        const userId = req.user.uid;

        if (!mode || !['PRO', 'FULL'].includes(mode)) {
            return res.status(400).json({ error: 'Valid mode is required (PRO or FULL)' });
        }

        const amount = mode === 'PRO' ? 300 : 700;

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const options = {
            amount: amount * 100,
            currency: 'INR',
            receipt: `rcpt_${userId.substring(0, 4)}_${Date.now()}`.substring(0, 40),
            notes: {
                userId,
                mode,
            },
        };

        const order = await razorpay.orders.create(options);
        res.status(200).json(order);
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        const errorMsg = error.error ? error.error.description || error.error.reason : error.message;
        res.status(500).json({ error: errorMsg || 'Failed to create order' });
    }
};

export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mode, amount } = req.body;
        const userId = req.user.uid;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !mode) {
            return res.status(400).json({ error: 'Missing payment verification fields' });
        }

        const sign = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expectedSign = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(sign)
            .digest('hex');

        if (expectedSign !== razorpay_signature) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        let paymentEntity;
        try {
            paymentEntity = await razorpay.payments.fetch(razorpay_payment_id);
        } catch (e) {
            console.error('Razorpay payments.fetch failed:', e);
            return res.status(502).json({ error: 'Unable to verify payment with provider' });
        }

        if (paymentEntity.status !== 'captured' && paymentEntity.status !== 'authorized') {
            return res.status(400).json({ error: `Payment not successful (status: ${paymentEntity.status})` });
        }
        if (paymentEntity.order_id !== razorpay_order_id) {
            return res.status(400).json({ error: 'Payment does not match order' });
        }

        let notes = paymentEntity.notes || {};
        if (!notes.userId || !notes.mode) {
            try {
                const orderEntity = await razorpay.orders.fetch(razorpay_order_id);
                notes = { ...(orderEntity.notes || {}), ...notes };
            } catch (e) {
                console.warn('Could not load order notes for verification:', e.message);
            }
        }

        if (String(notes.userId) !== String(userId)) {
            return res.status(403).json({ error: 'Payment was created for a different account' });
        }
        if (String(notes.mode) !== String(mode)) {
            return res.status(400).json({ error: 'Payment mode mismatch' });
        }

        const amountRupees = amount || (mode === 'PRO' ? 300 : 700);

        const razorpaySnapshot = razorpayPaymentReceiptSnapshot(paymentEntity);

        const { user, alreadyProcessed } = await activatePlanFromPayment({
            userId,
            mode,
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            amountInRupees: amountRupees,
            email: req.body.email || paymentEntity.email,
            displayName: req.body.displayName,
            tryClerkMetadata: req.user.provider === 'clerk',
            razorpaySnapshot,
        });

        const fresh = user ? (await User.findOne({ userId })) || user : null;

        res.status(200).json({
            message: alreadyProcessed ? 'Payment already processed' : 'Payment verified successfully',
            user: toPublicUser(fresh),
        });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
};

/** Successful purchases for receipts (no signature in response) */
export const getMyPaymentReceipts = async (req, res) => {
    try {
        const rows = await Payment.find({ userId: req.user.uid, status: 'SUCCESS' })
            .sort({ createdAt: -1 })
            .select('-razorpay_signature')
            .lean();

        const payments = rows.map((p) => ({
            id: p._id,
            mode: p.mode,
            amount: p.amount,
            currency: p.currency || 'INR',
            razorpay_order_id: p.razorpay_order_id || '',
            razorpay_payment_id: p.razorpay_payment_id || '',
            status: p.status,
            razorpayStatus: p.razorpayStatus || '',
            paymentMethod: p.paymentMethod || '',
            bank: p.bank || '',
            wallet: p.wallet || '',
            vpa: p.vpa || '',
            payerRzpEmail: p.payerRzpEmail || '',
            email: p.email || '',
            username: p.username || '',
            contactPhone: p.contactPhone || '',
            international: !!p.international,
            feeRupee: p.feeRupee,
            taxRupee: p.taxRupee,
            cardNetwork: p.cardNetwork || '',
            cardLast4: p.cardLast4 || '',
            description: p.description || '',
            paidAtReceipt: p.rzpCapturedAt || p.rzpPaidAt || p.createdAt,
            captureAtReceipt: p.rzpCapturedAt,
            createdAtReceipt: p.createdAt,
        }));

        res.json({ payments });
    } catch (error) {
        console.error('getMyPaymentReceipts:', error);
        res.status(500).json({ error: 'Failed to load payment receipts' });
    }
};
