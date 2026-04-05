import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import dotenv from 'dotenv';

dotenv.config();

export const createOrder = async (req, res) => {
    try {
        const { mode } = req.body; // "PRO" or "FULL"
        const userId = req.user.uid;

        if (!mode || !['PRO', 'FULL'].includes(mode)) {
            return res.status(400).json({ error: 'Valid mode is required (PRO or FULL)' });
        }

        const amount = mode === 'PRO' ? 300 : 700; // INR 300 or 700

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const options = {
            amount: amount * 100, // convert to paise
            currency: 'INR',
            receipt: `rcpt_${userId.substring(0, 4)}_${Date.now()}`.substring(0, 40),
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

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            // Find User
            const user = await User.findOne({ userId });
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            // Update user properties
            const updateProps = {
                razorpay_payment_id,
                razorpay_order_id,
                razorpay_signature,
                premiumActivatedAt: new Date(),
                isPremium: true
            };

            if (mode === 'PRO') {
                updateProps.hasPro = true;
            } else if (mode === 'FULL') {
                updateProps.hasFullAccess = true;
                updateProps.hasPro = true; // Full implies pro too
            }

            await User.findOneAndUpdate({ userId }, updateProps);

            // Save to Payments Collection
            const newPayment = new Payment({
                userId: user.userId,
                username: user.displayName || user.email.split('@')[0],
                email: user.email,
                amount: amount || (mode === 'PRO' ? 300 : 700),
                mode: mode,
                razorpay_payment_id,
                razorpay_order_id,
                razorpay_signature,
                status: 'SUCCESS'
            });

            await newPayment.save();

            res.status(200).json({ message: "Payment verified successfully", ...updateProps });
        } else {
            res.status(400).json({ error: "Invalid payment signature" });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
};
