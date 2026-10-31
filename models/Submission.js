const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    },
    assignmentId: {
      type: String,
      ref: "Assignment",
      required: [true, "Assignment ID is required"],
    },
    assignmentTitle: {
      type: String,
      default: "Assignment",
    },
    courseId: {
      type: String,
      ref: "Course",
      default: "crs-1",
    },
    courseName: {
      type: String,
      default: "Course",
    },
    studentId: {
      type: String,
      ref: "User",
      required: [true, "Student ID is required"],
    },
    studentName: {
      type: String,
      default: "Student",
    },
    studentAvatar: {
      type: String,
      default: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    },
    submissionDate: {
      type: String,
      default: () => new Date().toISOString().replace("T", " ").slice(0, 16),
    },
    submissionType: {
      type: String,
      default: "file",
    },
    content: {
      type: String,
      trim: true,
      default: "",
      maxlength: [5000, "Content must be at most 5000 characters"],
    },
    linkUrl: {
      type: String,
      trim: true,
      default: "",
      validate: {
        // Empty is allowed (content or a file can be used instead)
        validator: (v) => !v || /^https?:\/\/\S+$/i.test(v),
        message: "Link must be a valid URL starting with http:// or https://",
      },
    },
    fileName: {
      type: String,
      default: "",
    },
    fileSize: {
      type: String,
      default: "",
    },
    fileUrl: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Submitted", "Graded", "submitted", "graded"],
      default: "Submitted",
    },
    score: {
      type: Number,
      default: null,
      min: [0, "Score cannot be negative"],
    },
    maxScore: {
      type: Number,
      default: 100,
    },
    feedback: {
      type: String,
      default: "",
      maxlength: [1000, "Feedback must be at most 1000 characters"],
    },
    rubricScores: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    gradedBy: {
      type: String,
      default: null,
    },
    gradedAt: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Proposal rule: a submission needs content, a link, or an uploaded file
submissionSchema.pre("validate", function () {
  if (!this.content && !this.linkUrl && !this.fileUrl && !this.fileName) {
    this.invalidate("content", "Add text content, a link, or a file before submitting");
  }
});

// Proposal rule: score cannot exceed the assignment's maxScore (copied onto the submission)
submissionSchema.path("score").validate(function (v) {
  return v === null || v === undefined || v <= (this.maxScore || 100);
}, "Score cannot be higher than the maximum score");

module.exports = mongoose.model("Submission", submissionSchema);
