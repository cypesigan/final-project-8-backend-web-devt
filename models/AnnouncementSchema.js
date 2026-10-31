const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => `anc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    },
    courseId: {
      type: String,
      ref: "Course",
      required: [true, "Course ID is required"],
    },
    courseName: {
      type: String,
      default: "Course",
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    author: {
      type: String,
      default: "Instructor",
    },
    authorAvatar: {
      type: String,
      default: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
    },
    role: {
      type: String,
      default: "Faculty / Instructor",
    },
    // Fields the frontend reads/sends
    authorName: {
      type: String,
      default: "",
    },
    authorRole: {
      type: String,
      default: "",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    date: {
      type: String,
      default: () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      default: "Normal",
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Announcement", announcementSchema);
