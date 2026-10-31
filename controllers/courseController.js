const Course = require("../models/Course");
const Assignment = require("../models/Assignment");
const Quiz = require("../models/Quiz");
const Material = require("../models/Materials");
const Submission = require("../models/Submission");
const QuizSubmission = require("../models/QuizSubmission");
const User = require("../models/User");

// GET /api/courses
const getCourses = async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: 1 });
    const formatted = courses.map((c) => {
      const obj = c.toObject();
      obj.id = obj._id;
      return obj;
    });
    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch courses", error: error.message });
  }
};

// GET /api/courses/:id
const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    const obj = course.toObject();
    obj.id = obj._id;
    res.status(200).json(obj);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch course", error: error.message });
  }
};

// POST /api/courses
const createCourse = async (req, res) => {
  try {
    const data = req.body;
    if (data.id && !data._id) {
      data._id = data.id;
    }
    const newCourse = await Course.create(data);
    const obj = newCourse.toObject();
    obj.id = obj._id;
    res.status(201).json(obj);
  } catch (error) {
    res.status(400).json({ message: "Failed to create course", error: error.message });
  }
};

// PUT /api/courses/:id
const updateCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    const obj = course.toObject();
    obj.id = obj._id;
    res.status(200).json(obj);
  } catch (error) {
    res.status(400).json({ message: "Failed to update course", error: error.message });
  }
};

// DELETE /api/courses/:id
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    // Remove everything that belonged to the course and un-enroll its students.
    const id = req.params.id;
    await Promise.all([
      Assignment.deleteMany({ courseId: id }),
      Quiz.deleteMany({ courseId: id }),
      Material.deleteMany({ courseId: id }),
      Submission.deleteMany({ courseId: id }),
      QuizSubmission.deleteMany({ courseId: id }),
      User.updateMany({}, { $pull: { enrolledCourseIds: id, assignedCourseIds: id } }),
    ]);
    res.status(200).json({ message: "Course deleted successfully", id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete course", error: error.message });
  }
};

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
};
