// ===============================
// 🔒 Global Error Handling
// ===============================
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});

// ===============================
// Environment Variables
// ===============================
import "dotenv/config";

// ===============================
// Imports
// ===============================
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

// ===============================
// Routes
// ===============================
import taskRoutes from "./routes/tasks.js";
import statsRoutes from "./routes/stats.js";
import userRoutes from "./routes/users.js";
import webBlockRoutes from "./routes/webBlock.js";
import notionRoutes from "./routes/notion.js";
import habitRoutes from "./routes/habits.js";
import adminRoutes from "./routes/admin.js";
import focusScoreRoutes from "./routes/focusScore.js";
import journalRoutes from "./routes/journal.js";
import notesRoutes from "./routes/notes.js";
import authRoutes from "./routes/auth.js";
import upgradeRoutes from "./routes/upgrade.js";
import paymentRoutes from "./routes/payment.js";
import notificationRoutes from "./routes/notifications.js";

// ===============================
// Controllers
// ===============================
import { handleRazorpayWebhook } from "./controllers/webhookController.js";

// ===============================
// App Config
// ===============================
const app = express();

const PORT = process.env.PORT || 5001;

// ===============================
// CORS
// ===============================
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

// ===============================
// Razorpay Webhook
// Must come BEFORE express.json()
// ===============================
app.post(
  "/api/payment/webhook",
  express.raw({ type: "*/*", limit: "512kb" }),
  handleRazorpayWebhook
);

// ===============================
// Middleware
// ===============================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ===============================
// Request Logger
// ===============================
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
  );
  next();
});

// ===============================
// Health Check Route
// ===============================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "FocusFlow Backend API Running 🚀",
  });
});

// ===============================
// API Routes
// ===============================
app.use("/api/auth", authRoutes);
app.use("/api/upgrade", upgradeRoutes);
app.use("/api/journal", journalRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/web-block", webBlockRoutes);
app.use("/api/notion", notionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/focus-score", focusScoreRoutes);
app.use("/api/notifications", notificationRoutes);

// ===============================
// 404 Route
// ===============================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API Route Not Found",
  });
});

// ===============================
// Error Handling Middleware
// ===============================
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ===============================
// Database Connection
// ===============================
if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI missing in environment variables");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Failed:", err);
    process.exit(1);
  });