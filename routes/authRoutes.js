const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getMe,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);

// Own profile (always the logged-in user, never an id from the URL)
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.delete("/profile", protect, deleteAccount);
router.put("/password", protect, changePassword);

module.exports = router;