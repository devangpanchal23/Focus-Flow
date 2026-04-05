require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    password: { type: String },
    displayName: { type: String },
    photoURL: { type: String },
    premiumStatus: { type: Boolean, default: false },
    role: { type: String, enum: ["admin", "moderator", "user"], default: "user" },
    isBlocked: { type: Boolean, default: false },
    lastLogin: { type: Date }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function createAdmin() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/blitzit_clone');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    await User.findOneAndUpdate(
        { email: 'admin@focusflow.com' },
        { 
            userId: 'real_admin_123',
            email: 'admin@focusflow.com',
            password: hashedPassword,
            displayName: 'System Admin',
            role: 'admin'
        },
        { upsert: true, new: true }
    );
    console.log('Admin user updated with password.');
    process.exit(0);
}
createAdmin();
