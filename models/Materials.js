const mongoose = require("mongoose");

const materialSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => `mat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
    type: {
      type: String,
      default: "document",
    },
    size: {
      type: String,
      default: "1.0 MB",
    },
    unit: {
      type: String,
      default: "Unit 1",
    },
    downloads: {
      type: Number,
      default: 0,
    },
    updatedAtFormatted: {
      type: String,
      default: () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    },
    linkUrl: {
      type: String,
      default: "",
    },
    // Fields the frontend reads/sends
    courseTitle: {
      type: String,
      default: "",
    },
    uploadDate: {
      type: String,
      default: () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    },
    downloadUrl: {
      type: String,
      default: "",
    },
    unitIdx: {
      type: Number,
    },
    description: {
      type: String,
      default: "",
    },
    uploadedBy: {
      type: String,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Material", materialSchema);
