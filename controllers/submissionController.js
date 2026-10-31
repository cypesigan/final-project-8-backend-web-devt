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

    // One submission per student per assignment.
    // The frontend's "Resubmit Work" button sends a new submission: replace the old one while it is ungraded.
    const existing = await Submission.findOne({ assignmentId: assignment._id, studentId: student._id });
    if (existing && isGraded(existing)) {
      return res.status(400).json({ message: "This assignment has already been graded and cannot be resubmitted" });
    }

    const newSub = new Submission(data);
    await newSub.validate(); // check the new work first, so a bad resubmission keeps the old one
    if (existing) await existing.deleteOne();
    await newSub.save();
    res.status(201).json(newSub);
  } catch (error) {
    sendError(res, error, "Failed to submit assignment");
  }
};

// PATCH /api/submissions/:id/grade (teacher/admin)
// Body: { score, feedback?, rubricScores? }. Score must be between 0 and the assignment's maxScore.
const gradeSubmission = async (req, res) => {
  try {
    const { score, feedback, rubricScores } = req.body;

    const sub = await Submission.findById(req.params.id);
    if (!sub) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Use the assignment's current maxScore (the copy on the submission may be outdated)
    const assignment = await Assignment.findById(sub.assignmentId);
    const maxScore = (assignment && assignment.maxScore) || sub.maxScore || 100;

    const numericScore = score === "" || score === null || score === undefined ? NaN : Number(score);
    if (!Number.isFinite(numericScore)) {
      return res.status(400).json({ message: "Score is required and must be a number" });
    }
    if (numericScore < 0 || numericScore > maxScore) {
      return res.status(400).json({ message: `Score must be between 0 and ${maxScore}` });
    }
    if (feedback !== undefined && String(feedback).length > 1000) {
      return res.status(400).json({ message: "Feedback must be at most 1000 characters" });
    }

    // The grader's name comes from the database, never from the body
    const grader = await User.findById(req.user.id);

    sub.score = numericScore;
    sub.maxScore = maxScore;
    if (feedback !== undefined) sub.feedback = feedback;
    if (rubricScores !== undefined) sub.rubricScores = rubricScores;
    sub.status = "Graded";
    sub.gradedBy = grader ? grader.name : "Instructor";
    sub.gradedAt = new Date().toISOString().replace("T", " ").slice(0, 16);
    await sub.save(); // runs the schema validators

    res.status(200).json(sub);
  } catch (error) {
    sendError(res, error, "Failed to grade submission");
  }
};

// A submission counts as graded once it has a score or the "Graded" status
function isGraded(sub) {
  return (sub.score !== null && sub.score !== undefined) || String(sub.status).toLowerCase() === "graded";
}

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
