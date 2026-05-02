import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    username: { type: String, required: true },
    email: { type: String, required: true },
    amount: { type: Number, required: true },
    mode: { type: String, enum: ['PRO', 'FULL'], required: true },
    razorpay_payment_id: { type: String, unique: true, sparse: true },
    razorpay_order_id: String,
    razorpay_signature: String,
    status: { type: String, enum: ['SUCCESS', 'FAILED'], default: 'FAILED' },
    createdAt: { type: Date, default: Date.now },
    // Razorpay receipt snapshot (populated when payment is verified via API / webhook)
    currency: { type: String, default: 'INR' },
    paymentMethod: String,
    razorpayStatus: String,
    bank: String,
    wallet: String,
    vpa: String,
    payerRzpEmail: String,
    contactPhone: String,
    international: { type: Boolean, default: false },
    feeRupee: Number,
    taxRupee: Number,
    cardNetwork: String,
    cardLast4: String,
    description: String,
    rzpPaidAt: Date,
    rzpCapturedAt: Date,
});

export default mongoose.model('Payment', PaymentSchema);
