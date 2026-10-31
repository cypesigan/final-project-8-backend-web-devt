const User = require("../models/User");
const jwt = require("jsonwebtoken");

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

module.exports = { register, login, getMe };
