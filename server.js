require("dotenv").config();

// Tokens are signed in authController and verified in authMiddleware, both with this secret
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is missing");
  process.exit(1);
}

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const connectDB = require("./config/db");
const seedDatabase = require("./seed");
const User = require("./models/User");
const { protect, authorize } = require("./middleware/authMiddleware");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Basic Health Check
app.get("/", (req, res) => {
  res.json({ message: "CacheUp API is running smoothly", status: "ok" });
});

app.get("/api/health", (req, res) => {
  res.json({
    message: "CacheUp API is healthy",
    db: mongoose.connection.readyState === 1,
    timestamp: new Date().toISOString(),
  });
});

// Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const courseRoutes = require("./routes/courseRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const quizRoutes = require("./routes/quizRoutes");
const materialRoutes = require("./routes/materialRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/schedule", scheduleRoutes);

// Reseed wipes ALL data: admin only, and only when ALLOW_RESEED=true in .env
app.post("/api/admin/reseed", protect, authorize("admin"), async (req, res) => {
  if (process.env.ALLOW_RESEED !== "true") {
    return res.status(403).json({ message: "Reseed is disabled" });
  }
  try {
    await seedDatabase();
    res.json({ message: "Database reseeded successfully from mock data!" });
  } catch (error) {
    res.status(500).json({ message: "Reseeding failed", error: error.message });
  }
});

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  try {
    // Check if database has users; if not, automatically seed it!
    const count = await User.countDocuments();
    if (count === 0) {
      console.log("Database is empty. Automatically running initial seeding...");
      await seedDatabase();
    } else {
      console.log(`Database already contains ${count} user accounts.`);
    }
  } catch (err) {
    console.error("Auto-seeding check error:", err.message);
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
