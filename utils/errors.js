// Map an error to a response: bad input → 400 with a readable message, anything else → generic 500
const sendError = (res, error, fallback = "Server error") => {
  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(", ") });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ message: `Invalid value for ${error.path}` });
  }
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0] || "field";
    return res.status(400).json({ message: `A record with this ${field} already exists` });
  }
  console.error(error);
  return res.status(500).json({ message: fallback });
};

module.exports = { sendError };
