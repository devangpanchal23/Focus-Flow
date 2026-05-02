import User from '../models/User.js';
import Payment from '../models/Payment.js';
import eventBus from './EventBus.js';
import { clerkClient } from '@clerk/express';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Idempotent premium activation from a verified Razorpay payment.
 * Retries DB writes on transient failures.
 */
export async function activatePlanFromPayment({
    userId,
    mode,
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    amountInRupees,
    email,
    displayName,
    tryClerkMetadata = true,
    razorpaySnapshot = {},
}) {
    const existing = await Payment.findOne({ razorpay_payment_id });
    if (existing?.status === 'SUCCESS') {
        const user = await User.findOne({ userId });
        return { alreadyProcessed: true, user };
    }

    const updateProps = {
        razorpay_payment_id,
        razorpay_order_id,
        ...(razorpay_signature != null && { razorpay_signature }),
        premiumActivatedAt: new Date(),
        isPremium: true,
        paymentStatus: 'completed',
        lastTransactionId: razorpay_payment_id,
    };
    if (mode === 'PRO') {
        updateProps.hasPro = true;
        updateProps.planType = 'pro';
    } else if (mode === 'FULL') {
        updateProps.hasFullAccess = true;
        updateProps.hasPro = true;
        updateProps.planType = 'full';
    } else {
        throw new Error('Invalid payment mode');
    }

    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const user = await User.findOneAndUpdate(
                { userId },
                {
                    $set: updateProps,
                    $setOnInsert: {
                        userId,
                        email: email || `user_${userId}@focusflow.com`,
                        displayName: displayName || 'Premium User',
                        role: 'normal',
                        status: 'accepted',
                    },
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            const paymentDoc = new Payment({
                userId: user.userId,
                username: user.displayName || user.email.split('@')[0],
                email: user.email,
                amount: amountInRupees,
                mode,
                razorpay_payment_id,
                razorpay_order_id,
                razorpay_signature,
                status: 'SUCCESS',
                ...(razorpaySnapshot && typeof razorpaySnapshot === 'object' ? razorpaySnapshot : {}),
            });
            await paymentDoc.save();

            if (tryClerkMetadata) {
                try {
                    await clerkClient.users.updateUserMetadata(userId, {
                        publicMetadata: {
                            hasPro: user.hasPro,
                            hasFullAccess: user.hasFullAccess,
                            role: user.role,
                            planType: user.planType,
                            paymentStatus: user.paymentStatus,
                        },
                    });
                } catch (e) {
                    console.warn('Clerk metadata update skipped or failed:', e.message || e);
                }
            }

            eventBus.emit('PURCHASE_COMPLETED', {
                userId: user.userId,
                receiptId: paymentDoc._id.toString(),
                amount: paymentDoc.amount,
            });

            return { user, payment: paymentDoc };
        } catch (err) {
            lastErr = err;
            if (err.code === 11000) {
                const user = await User.findOne({ userId });
                return { alreadyProcessed: true, user };
            }
            await sleep(250 * (attempt + 1));
        }
    }
    throw lastErr;
}
