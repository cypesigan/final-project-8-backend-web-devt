const Course = require("../models/Course");
const Assignment = require("../models/Assignment");
const Quiz = require("../models/Quiz");
const Material = require("../models/Materials");
const Submission = require("../models/Submission");
const QuizSubmission = require("../models/QuizSubmission");
const User = require("../models/User");
const { sendError } = require("../utils/errors");

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

// GET /api/courses/my-courses
// Student: courses they are enrolled in. Teacher: courses they handle. Admin: all courses.
const getMyCourses = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let filter = {};
    if (user.role === "student") {
      filter = { _id: { $in: user.enrolledCourseIds } };
    } else if (user.role === "teacher") {
      filter = {
        $or: [
          { instructorId: user._id },
          { teacher: user._id },
          { _id: { $in: user.assignedCourseIds } },
        ],
      };
    }

    const courses = await Course.find(filter).sort({ createdAt: 1 });
    res.status(200).json(courses);
  } catch (error) {
    sendError(res, error, "Failed to fetch your courses");
  }
};

// POST /api/courses/:id/enroll (student)
// User.enrolledCourseIds is the source of truth; Course.students and studentsCount follow it.
const enrollCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.enrolledCourseIds.includes(course._id)) {
      return res.status(400).json({ message: "You are already enrolled in this course" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $addToSet: { enrolledCourseIds: course._id } },
      { new: true }
    );
    const updatedCourse = await Course.findByIdAndUpdate(
      course._id,
      { $addToSet: { students: user._id }, $inc: { studentsCount: 1 } },
      { new: true }
    );

    res.status(200).json({
      message: `Enrolled in ${updatedCourse.title}`,
      courseId: updatedCourse._id,
      studentsCount: updatedCourse.studentsCount,
      enrolledCourseIds: updatedUser.enrolledCourseIds,
    });
  } catch (error) {
    sendError(res, error, "Failed to enroll in course");
  }
};

// DELETE /api/courses/:id/enroll (student)
const unenrollCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.enrolledCourseIds.includes(course._id)) {
      return res.status(400).json({ message: "You are not enrolled in this course" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $pull: { enrolledCourseIds: course._id } },
      { new: true }
    );

    // Never let the count go below 0 (seeded counts are not tied to real students)
    const courseUpdate = { $pull: { students: user._id } };
    if (course.studentsCount > 0) courseUpdate.$inc = { studentsCount: -1 };
    const updatedCourse = await Course.findByIdAndUpdate(course._id, courseUpdate, { new: true });

    res.status(200).json({
      message: `Unenrolled from ${updatedCourse.title}`,
      courseId: updatedCourse._id,
      studentsCount: updatedCourse.studentsCount,
      enrolledCourseIds: updatedUser.enrolledCourseIds,
    });
  } catch (error) {
    sendError(res, error, "Failed to unenroll from course");
  }
};

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getMyCourses,
  enrollCourse,
  unenrollCourse,
};
