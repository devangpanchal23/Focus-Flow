import crypto from 'crypto';
import { activatePlanFromPayment } from '../services/paymentActivation.js';
import { razorpayPaymentReceiptSnapshot } from '../utils/razorpayReceiptFields.js';
import dotenv from 'dotenv';

dotenv.config();

export const handleRazorpayWebhook = async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.error('RAZORPAY_WEBHOOK_SECRET is not configured');
            return res.status(500).send('Webhook secret not configured');
        }

        const signature = req.headers['x-razorpay-signature'];
        const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

        const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

        if (expectedSignature !== signature) {
            console.warn('Invalid webhook signature');
            return res.status(400).send('Invalid signature');
        }

        const event = JSON.parse(rawBody.toString('utf8'));

        if (event.event === 'payment.captured') {
            const paymentEntity = event.payload.payment.entity;
            const razorpay_order_id = paymentEntity.order_id;
            const razorpay_payment_id = paymentEntity.id;
            const notes = paymentEntity.notes || {};
            const userId = notes.userId;
            const mode = notes.mode;

            if (userId == null || mode == null || mode === '') {
                console.error('Webhook payload missing userId or mode in notes', notes);
                return res.status(400).send('Missing notes');
            }

            const amountInRupees = paymentEntity.amount / 100;
            const razorpaySnapshot = razorpayPaymentReceiptSnapshot(paymentEntity);

            await activatePlanFromPayment({
                userId,
                mode,
                razorpay_payment_id,
                razorpay_order_id,
                razorpay_signature: undefined,
                amountInRupees,
                email: paymentEntity.email,
                displayName: undefined,
                tryClerkMetadata: true,
                razorpaySnapshot,
            });

            return res.status(200).send('Success');
        }

        return res.status(200).send('Event not handled');
    } catch (error) {
        console.error('Webhook error:', error);
        return res.status(500).send('Webhook error');
    }
};
