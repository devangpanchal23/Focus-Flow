import 'dotenv/config';
import express from 'express';



import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import taskRoutes from './routes/tasks.js';
import statsRoutes from './routes/stats.js';
import userRoutes from './routes/users.js';
import webBlockRoutes from './routes/webBlock.js';
import notionRoutes from './routes/notion.js';
import habitRoutes from './routes/habits.js';
import adminRoutes from './routes/admin.js';
import focusScoreRoutes from './routes/focusScore.js';
import journalRoutes from './routes/journal.js';
import notesRoutes from './routes/notes.js';
import authRoutes from './routes/auth.js';
import upgradeRoutes from './routes/upgrade.js';
import paymentRoutes from './routes/payment.js';
import notificationRoutes from './routes/notifications.js';
import { handleRazorpayWebhook } from './controllers/webhookController.js';


const app = express();
const PORT = process.env.PORT || 5001;
// Trigger restart

// Middleware
app.use(cors());
// Razorpay webhook signature verification requires the raw body (must be before express.json)
app.post(
    '/api/payment/webhook',
    express.raw({ type: '*/*', limit: '512kb' }),
    handleRazorpayWebhook
);
app.use(express.json());
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blitzit_clone')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Routes
console.log('Registering routes...')

app.use('/api/auth', authRoutes);
app.use('/api/upgrade', upgradeRoutes);
app.use('/api/journal', journalRoutes); // Journal routes
app.use('/api/notes', notesRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/web-block', webBlockRoutes);
app.use('/api/notion', notionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/focus-score', focusScoreRoutes);
app.use('/api/notifications', notificationRoutes);

// Error Handling Middleware for Clerk
app.use((err, req, res, next) => {
    if (err.message === 'Unauthenticated') {
        return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
    }
    console.error('SERVER ERROR:', err.stack);
    res.status(500).json({ message: 'Internal Server Error' });
});

// --- Serve production frontend ---
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../dist')));
    app.get('(.*)', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.send('FocusFlow API running. Run frontend separately in development.');
    });
}

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
