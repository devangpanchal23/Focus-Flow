import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    username: { type: String, required: true },
    email: { type: String, required: true },
    amount: { type: Number, required: true },
    mode: { type: String, enum: ['PRO', 'FULL'], required: true },
    razorpay_payment_id: String,
    razorpay_order_id: String,
    razorpay_signature: String,
    status: { type: String, enum: ['SUCCESS', 'FAILED'], default: 'FAILED' },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Payment', PaymentSchema);
