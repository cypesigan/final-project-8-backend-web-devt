const User = require("../models/User");
const Course = require("../models/Course");
const Submission = require("../models/Submission");
const QuizSubmission = require("../models/QuizSubmission");
const Schedule = require("../models/Schedule");
const jwt = require("jsonwebtoken");
const { sendError } = require("../utils/errors");

const JWT_SECRET = process.env.JWT_SECRET;

// ==== REGISTER ====
const register = async (req, res) => {
  try {
    const { name, email, password, studentId, department, bio, phone, notes } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    const generatedStudentId = studentId || `CU-${new Date().getFullYear()}-APP-${Math.floor(100 + Math.random() * 900)}`;
    const avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name.trim())}`;

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: "student",
      status: "pending",
      studentId: generatedStudentId,
      department: department || "School of Design & Creative Arts",
      bio: bio || "New student seeking enrollment at CacheUp Academy.",
      phone: phone || "+1 (555) 000-0000",
      avatar,
      registrationNotes: notes || "Submitted online student registration form.",
      points: 0,
      gpa: "N/A",
      streakDays: 0,
      studyHours: 0,
      enrolledCourseIds: [],
    });

    res.status(201).json({
      message: "Registration successful. Your account is awaiting admin approval.",
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        studentId: user.studentId,
        avatar: user.avatar,
        department: user.department,
        bio: user.bio,
        phone: user.phone,
        joinedDate: user.joinedDate,
        points: user.points,
        gpa: user.gpa,
        streakDays: user.streakDays,
        studyHours: user.studyHours,
        enrolledCourseIds: user.enrolledCourseIds,
      },
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ==== LOGIN ====
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "No user found with this email address" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password. Please check your credentials." });
    }

    if (user.status === "pending") {
      return res.status(403).json({ message: "Registration pending admin approval. You cannot log in yet." });
    }
    if (user.status === "rejected") {
      return res.status(403).json({ message: "Your registration was not approved. Please contact administration." });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const userObj = user.toObject();
    delete userObj.password;
    userObj.id = userObj._id;

    res.status(200).json({
      message: "Login successful",
      token,
      user: userObj,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ==== CURRENT USER (ME) ====
const getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized: Missing token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userObj = user.toObject();
    delete userObj.password;
    userObj.id = userObj._id;

    res.status(200).json({ user: userObj });
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired session", error: error.message });
  }
};

// Fields a user may change on their own profile. Everything else (role, status, points, email...) is admin-only.
const PROFILE_FIELDS = ["name", "bio", "phone", "avatar", "department", "title"];

const toUserJson = (user) => {
  const obj = user.toObject();
  delete obj.password;
  obj.id = obj._id;
  return obj;
};

// Checks the current password and sets the new one. Returns an error message, or null when OK.
// A wrong current password is a 400 (not 401), so the frontend doesn't treat it as "logged out".
const applyPasswordChange = async (user, currentPassword, newPassword) => {
  if (!currentPassword || !newPassword) {
    return "Current password and new password are required";
  }
  if (!(await user.comparePassword(currentPassword))) {
    return "Current password is incorrect";
  }
  if (newPassword.length < 8) {
    return "New password must be at least 8 characters";
  }
  if (currentPassword === newPassword) {
    return "New password must be different from the current password";
  }
  user.password = newPassword; // hashed by the pre("save") hook in models/User.js
  return null;
};

// ==== GET /api/auth/profile ====
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user: toUserJson(user) });
  } catch (error) {
    sendError(res, error, "Failed to fetch profile");
  }
};

// ==== PUT /api/auth/profile ====
// Body: any of name, bio, phone, avatar, department, title.
// Optional password change in the same request: currentPassword + newPassword.
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    PROFILE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    });

    if (req.body.newPassword !== undefined) {
      const problem = await applyPasswordChange(user, req.body.currentPassword, req.body.newPassword);
      if (problem) return res.status(400).json({ message: problem });
    }

    await user.save(); // save() runs the schema validators (e.g. name length)
    res.status(200).json({ message: "Profile updated", user: toUserJson(user) });
  } catch (error) {
    sendError(res, error, "Failed to update profile");
  }
};

// ==== PUT /api/auth/password ====
// Body: { currentPassword, newPassword }
const changePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const problem = await applyPasswordChange(user, req.body.currentPassword, req.body.newPassword);
    if (problem) return res.status(400).json({ message: problem });

    await user.save();
    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    sendError(res, error, "Failed to change password");
  }
};

// ==== DELETE /api/auth/profile ====
// Body: { password }. Deletes the account and the student's own data.
const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role === "admin") {
      return res.status(400).json({ message: "Admin accounts cannot be self-deleted" });
    }
    if (!req.body || !req.body.password || !(await user.comparePassword(req.body.password))) {
      return res.status(400).json({ message: "Password is incorrect" });
    }

    await Promise.all([
      Submission.deleteMany({ studentId: user._id }),
      QuizSubmission.deleteMany({ studentId: user._id }),
      Schedule.deleteOne({ _id: user._id }),
      // Leave every class list; lower the count only where it is above 0
      Course.updateMany(
        { _id: { $in: user.enrolledCourseIds }, studentsCount: { $gt: 0 } },
        { $inc: { studentsCount: -1 } }
      ),
      Course.updateMany({ students: user._id }, { $pull: { students: user._id } }),
    ]);
    await User.deleteOne({ _id: user._id });

    res.status(200).json({ message: "Your account has been deleted", id: user._id });
  } catch (error) {
    sendError(res, error, "Failed to delete account");
  }
};

module.exports = {
  register,
  login,
  getMe,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
};
