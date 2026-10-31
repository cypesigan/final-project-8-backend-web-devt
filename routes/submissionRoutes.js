const express = require("express");
const router = express.Router();
const {
  getSubmissions,
  submitAssignment,
  gradeSubmission,
  removeGrade,
  withdrawSubmission,
} = require("../controllers/submissionController");
const { protect, authorize } = require("../middleware/authMiddleware");

const staff = [protect, authorize("teacher", "admin")];

router.get("/", getSubmissions);
router.post("/", protect, authorize("student"), submitAssignment);
router.patch("/:id/grade", staff, gradeSubmission);
router.delete("/:id/grade", staff, removeGrade);
router.delete("/:id", protect, authorize("student"), withdrawSubmission);

module.exports = router;