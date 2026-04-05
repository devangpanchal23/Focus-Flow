require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    displayName: { type: String },
    photoURL: { type: String },
    premiumStatus: { type: Boolean, default: false },
    role: { type: String, enum: ["admin", "moderator", "user"], default: "user" },
    isBlocked: { type: Boolean, default: false },
    lastLogin: { type: Date }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function generate() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/blitzit_clone');
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
        console.log("No admin found in DB");
        process.exit(1);
    }
    const token = jwt.sign(
        { user_id: adminUser.userId }, // <-- Fixed the payload mapping
        process.env.JWT_SECRET || 'fallback_secret_key',
        { expiresIn: '7d' }
    );
    console.log("Admin Email:", adminUser.email);
    console.log("Token:", token);
    process.exit(0);
}
generate();
