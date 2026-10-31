const jwt = require("jsonwebtoken");

// Verify JWT, attach { id, role } to req.user
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const token = authHeader.split(" ")[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, invalid or expired token" });
  }
};

// Like protect, but never blocks: sets req.user when a valid token is sent, otherwise continues as a guest.
// Used on GET routes the frontend still calls without a token.
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    } catch (error) {
      // Invalid or expired token: treat as a guest
    }
  }
  next();
};

// Role check, use after protect: authorize("admin"), authorize("teacher", "admin")
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden: insufficient role" });
  }
  next();
};

module.exports = { protect, optionalAuth, authorize };