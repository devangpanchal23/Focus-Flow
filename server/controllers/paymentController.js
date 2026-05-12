// ===============================
// paymentController.js
// Production Safe Razorpay Controller
// ===============================

import Razorpay from "razorpay";
import crypto from "crypto";

import { activatePlanFromPayment } from "../services/paymentActivation.js";
import { razorpayPaymentReceiptSnapshot } from "../utils/razorpayReceiptFields.js";
import { toPublicUser } from "../utils/userPublic.js";

import User from "../models/User.js";
import Payment from "../models/Payment.js";

// ===============================
// Razorpay Instance
// ===============================
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ===============================
// Create Razorpay Order
// ===============================
export const createOrder = async (req, res) => {
    try {
        const { mode } = req.body;

        const userId = req.user?.uid;

        // -------------------------------
        // Validation
        // -------------------------------
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized user",
            });
        }

        if (!mode || !["PRO", "FULL"].includes(mode)) {
            return res.status(400).json({
                success: false,
                error: "Valid mode is required (PRO or FULL)",
            });
        }

        if (
            !process.env.RAZORPAY_KEY_ID ||
            !process.env.RAZORPAY_KEY_SECRET
        ) {
            return res.status(500).json({
                success: false,
                error: "Razorpay credentials missing",
            });
        }

        // -------------------------------
        // Pricing
        // -------------------------------
        const amount = mode === "PRO" ? 300 : 700;

        // -------------------------------
        // Order Options
        // -------------------------------
        const options = {
            amount: amount * 100,
            currency: "INR",

            receipt: `rcpt_${Date.now()}`,

            notes: {
                userId,
                mode,
            },
        };

        // -------------------------------
        // Create Order
        // -------------------------------
        const order = await razorpay.orders.create(options);

        return res.status(200).json({
            success: true,
            order,
        });

    } catch (error) {
        console.error("❌ CREATE ORDER ERROR:", error);

        return res.status(500).json({
            success: false,
            error: error.message || "Failed to create order",
        });
    }
};

// ===============================
// Verify Payment
// ===============================
export const verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            mode,
        } = req.body;

        const userId = req.user?.uid;

        // -------------------------------
        // Validation
        // -------------------------------
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized user",
            });
        }

        if (
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature ||
            !mode
        ) {
            return res.status(400).json({
                success: false,
                error: "Missing payment verification fields",
            });
        }

        // -------------------------------
        // Verify Signature
        // -------------------------------
        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                error: "Invalid payment signature",
            });
        }

        // -------------------------------
        // Fetch Payment
        // -------------------------------
        let paymentEntity;

        try {
            paymentEntity = await razorpay.payments.fetch(
                razorpay_payment_id
            );
        } catch (error) {
            console.error("❌ RAZORPAY FETCH ERROR:", error);

            return res.status(502).json({
                success: false,
                error: "Unable to verify payment with Razorpay",
            });
        }

        // -------------------------------
        // Validate Payment
        // -------------------------------
        if (
            paymentEntity.status !== "captured" &&
            paymentEntity.status !== "authorized"
        ) {
            return res.status(400).json({
                success: false,
                error: `Payment not successful (${paymentEntity.status})`,
            });
        }

        if (paymentEntity.order_id !== razorpay_order_id) {
            return res.status(400).json({
                success: false,
                error: "Payment does not match order",
            });
        }

        // -------------------------------
        // Validate Notes
        // -------------------------------
        let notes = paymentEntity.notes || {};

        if (!notes.userId || !notes.mode) {
            try {
                const orderEntity = await razorpay.orders.fetch(
                    razorpay_order_id
                );

                notes = {
                    ...(orderEntity.notes || {}),
                    ...notes,
                };
            } catch (error) {
                console.warn(
                    "⚠️ Unable to fetch order notes:",
                    error.message
                );
            }
        }

        if (String(notes.userId) !== String(userId)) {
            return res.status(403).json({
                success: false,
                error: "Payment belongs to another user",
            });
        }

        if (String(notes.mode) !== String(mode)) {
            return res.status(400).json({
                success: false,
                error: "Payment mode mismatch",
            });
        }

        // -------------------------------
        // Final Amount
        // -------------------------------
        const expectedAmountRupees =
            mode === "PRO" ? 300 : 700;
        const capturedAmountRupees = Math.round(
            Number(paymentEntity.amount || 0) / 100
        );

        if (
            capturedAmountRupees !== expectedAmountRupees
        ) {
            return res.status(400).json({
                success: false,
                error: "Captured amount mismatch",
            });
        }

        // -------------------------------
        // Snapshot
        // -------------------------------
        const razorpaySnapshot =
            razorpayPaymentReceiptSnapshot(paymentEntity);

        // -------------------------------
        // Activate Plan
        // -------------------------------
        const { user, alreadyProcessed } =
            await activatePlanFromPayment({
                userId,
                mode,

                razorpay_payment_id,
                razorpay_order_id,
                razorpay_signature,

                amountInRupees: capturedAmountRupees,

                email: req.body.email || paymentEntity.email,
                displayName: req.body.displayName,

                tryClerkMetadata: req.user?.provider === "clerk",

                razorpaySnapshot,
            });

        // -------------------------------
        // Get Updated User
        // -------------------------------
        const freshUser =
            (await User.findOne({ userId })) || user;

        // -------------------------------
        // Success Response
        // -------------------------------
        return res.status(200).json({
            success: true,

            message: alreadyProcessed
                ? "Payment already processed"
                : "Payment verified successfully",

            user: toPublicUser(freshUser),
        });

    } catch (error) {
        console.error("❌ VERIFY PAYMENT ERROR:", error);

        return res.status(500).json({
            success: false,
            error: error.message || "Failed to verify payment",
        });
    }
};

// ===============================
// Get Payment Receipts
// ===============================
export const getMyPaymentReceipts = async (req, res) => {
    try {
        const userId = req.user?.uid;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized user",
            });
        }

        const rows = await Payment.find({
            userId,
            status: "SUCCESS",
        })
            .sort({ createdAt: -1 })
            .select("-razorpay_signature")
            .lean();

        const payments = rows.map((payment) => ({
            id: payment._id,

            mode: payment.mode,
            amount: payment.amount,

            currency: payment.currency || "INR",

            razorpay_order_id:
                payment.razorpay_order_id || "",

            razorpay_payment_id:
                payment.razorpay_payment_id || "",

            status: payment.status,

            razorpayStatus:
                payment.razorpayStatus || "",

            paymentMethod:
                payment.paymentMethod || "",

            bank: payment.bank || "",
            wallet: payment.wallet || "",
            vpa: payment.vpa || "",

            payerRzpEmail:
                payment.payerRzpEmail || "",

            email: payment.email || "",

            username: payment.username || "",

            contactPhone:
                payment.contactPhone || "",

            international: !!payment.international,

            feeRupee: payment.feeRupee,
            taxRupee: payment.taxRupee,

            cardNetwork:
                payment.cardNetwork || "",

            cardLast4:
                payment.cardLast4 || "",

            description:
                payment.description || "",

            paidAtReceipt:
                payment.rzpCapturedAt ||
                payment.rzpPaidAt ||
                payment.createdAt,

            captureAtReceipt:
                payment.rzpCapturedAt,

            createdAtReceipt:
                payment.createdAt,
        }));

        return res.status(200).json({
            success: true,
            payments,
        });

    } catch (error) {
        console.error("❌ PAYMENT RECEIPTS ERROR:", error);

        return res.status(500).json({
            success: false,
            error: "Failed to load payment receipts",
        });
    }
};