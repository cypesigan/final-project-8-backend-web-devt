const Submission = require("../models/Submission");
const Assignment = require("../models/Assignment");
const User = require("../models/User");
const { sendError } = require("../utils/errors");

// GET /api/submissions
const getSubmissions = async (req, res) => {
  try {
    const filter = {};
    if (req.query.studentId) filter.studentId = req.query.studentId;
    if (req.query.assignmentId) filter.assignmentId = req.query.assignmentId;
    if (req.query.courseId) filter.courseId = req.query.courseId;

    const subs = await Submission.find(filter).sort({ createdAt: -1 });
    const formatted = subs.map((s) => {
      const obj = s.toObject();
      obj.id = obj._id;
      return obj;
    });
    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch submissions", error: error.message });
  }
};

// POST /api/submissions (submit assignment, student)
// Who submitted comes from the token. Assignment details come from the database.
// Only the student's own work is read from the body; score, status and feedback always start empty.
const submitAssignment = async (req, res) => {
  try {
    const { id, assignmentId, submissionType, content, linkUrl, fileName, fileSize, fileUrl } = req.body;

    if (!assignmentId) {
      return res.status(400).json({ message: "Assignment ID is required" });
    }
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }
    const student = await User.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ message: "User not found" });
    }

    const data = {
      assignmentId: assignment._id,
      assignmentTitle: assignment.title,
      courseId: assignment.courseId,
      courseName: assignment.courseName,
      maxScore: assignment.maxScore,
      studentId: student._id,
      studentName: student.name,
      studentAvatar: student.avatar,
      submissionType,
      content,
      linkUrl,
      fileName,
      fileSize,
      fileUrl,
    };
    if (id) data._id = id; // the frontend creates "sub-..." ids and keeps using them

    const newSub = await Submission.create(data);
    res.status(201).json(newSub);
  } catch (error) {
    sendError(res, error, "Failed to submit assignment");
  }
};

// PATCH /api/submissions/:id/grade
const gradeSubmission = async (req, res) => {
  try {
    const { score, feedback, rubricScores, gradedBy } = req.body;
    const sub = await Submission.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          score: parseInt(score, 10),
          feedback,
          rubricScores,
          status: "Graded",
          gradedBy: gradedBy || "Instructor",
          gradedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
        },
      },
      { new: true }
    );
    if (!sub) {
      return res.status(404).json({ message: "Submission not found" });
    }
    const obj = sub.toObject();
    obj.id = obj._id;
    res.status(200).json(obj);
  } catch (error) {
    res.status(400).json({ message: "Failed to grade submission", error: error.message });
  }
};

// A submission counts as graded once it has a score or the "Graded" status
const isGraded = (sub) =>
  (sub.score !== null && sub.score !== undefined) || String(sub.status).toLowerCase() === "graded";

// DELETE /api/submissions/:id/grade (teacher/admin)
// Removes the score and feedback; the submission itself stays, back to "Submitted".
const removeGrade = async (req, res) => {
  try {
    const sub = await Submission.findById(req.params.id);
    if (!sub) {
      return res.status(404).json({ message: "Submission not found" });
    }
    if (!isGraded(sub)) {
      return res.status(400).json({ message: "This submission has not been graded yet" });
    }

    sub.score = null;
    sub.feedback = "";
    sub.rubricScores = null;
    sub.gradedBy = null;
    sub.gradedAt = null;
    sub.status = "Submitted";
    await sub.save();

    res.status(200).json(sub);
  } catch (error) {
    sendError(res, error, "Failed to remove grade");
  }
};

// DELETE /api/submissions/:id (student)
// A student can withdraw only their own submission, and only before it is graded.
const withdrawSubmission = async (req, res) => {
  try {
    const sub = await Submission.findById(req.params.id);
    if (!sub) {
      return res.status(404).json({ message: "Submission not found" });
    }
    if (sub.studentId !== req.user.id) {
      return res.status(403).json({ message: "You can only withdraw your own submission" });
    }
    if (isGraded(sub)) {
      return res.status(400).json({ message: "Graded submissions cannot be withdrawn" });
    }

    await sub.deleteOne();
    res.status(200).json({ message: "Submission withdrawn", id: sub._id });
  } catch (error) {
    sendError(res, error, "Failed to withdraw submission");
  }
};

module.exports = {
  getSubmissions,
  submitAssignment,
  gradeSubmission,
  removeGrade,
  withdrawSubmission,
};
