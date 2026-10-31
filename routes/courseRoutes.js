const express = require("express");
const router = express.Router();
const {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getMyCourses,
  enrollCourse,
  unenrollCourse,
} = require("../controllers/courseController");
const { protect, authorize } = require("../middleware/authMiddleware");

const staff = [protect, authorize("teacher", "admin")];
const student = [protect, authorize("student")];

router.get("/", getCourses);
// Must stay above "/:id", or Express reads "my-courses" as a course id
router.get("/my-courses", protect, getMyCourses);
router.get("/:id", getCourseById);
router.post("/:id/enroll", student, enrollCourse);
router.delete("/:id/enroll", student, unenrollCourse);
router.post("/", staff, createCourse);
router.put("/:id", staff, updateCourse);
router.delete("/:id", staff, deleteCourse);

module.exports = router;