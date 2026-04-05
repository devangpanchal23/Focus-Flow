require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

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

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/blitzit_clone');
    
    // Check if admin exists
    const adminExists = await User.findOne({ email: 'admin@test.com' });
    if (!adminExists) {
        await User.create({
            userId: 'admin_test_123',
            email: 'admin@test.com',
            displayName: 'System Admin',
            role: 'admin'
        });
        console.log("Admin seeded.");
    }

    // Seed some test users
    for(let i=1; i<=3; i++) {
        const userExists = await User.findOne({ email: `user${i}@test.com` });
        if (!userExists) {
            await User.create({
                userId: `user_test_${i}`,
                email: `user${i}@test.com`,
                displayName: `Test User ${i}`,
                role: 'user'
            });
            console.log(`User ${i} seeded.`);
        }
    }
    process.exit(0);
}
seed();
