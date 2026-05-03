// 🔒 Catch unexpected errors (keep at top)
process.on("uncaughtException", err => {
  console.error("UNCAUGHT ERROR:", err);
});

process.on("unhandledRejection", err => {
  console.error("UNHANDLED PROMISE:", err);
});

// Load env variables
import 'dotenv/config';

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Routes
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

// Webhook
import { handleRazorpayWebhook } from './controllers/webhookController.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ===============================
// Middleware
// ===============================
app.use(cors());

// Razorpay webhook (must come before json parser)
app.post(
  '/api/payment/webhook',
  express.raw({ type: '*/*', limit: '512kb' }),
  handleRazorpayWebhook
);

app.use(express.json());

// Request logger (optional but helpful)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ===============================
// Database Connection (SAFE)
// ===============================
if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI is missing in environment variables");
  process.exit(1);
}

  mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

// ===============================
// Routes
// ===============================
console.log('Registering routes...');

app.use('/api/auth', authRoutes);
app.use('/api/upgrade', upgradeRoutes);
app.use('/api/journal', journalRoutes);
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

// ===============================
// Error Handling Middleware
// ===============================
app.use((err, req, res, next) => {
  if (err.message === 'Unauthenticated') {
    return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
  }
  console.error('SERVER ERROR:', err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

// ===============================
// Frontend Serving (Production)
// ===============================

  app.get('/', (req, res) => {
    res.send('FocusFlow API running. Frontend should run separately.');
  });

// ===============================
// Start Server
// ===============================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});