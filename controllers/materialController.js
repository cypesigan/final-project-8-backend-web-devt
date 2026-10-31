const Material = require("../models/Materials");
const User = require("../models/User");

// GET /api/materials?courseId=
// Logged-in students only see materials of courses they are enrolled in.
// Guests, teachers and admins see everything (filtered by courseId when given).
const getMaterials = async (req, res) => {
  try {
    const filter = {};
    if (req.query.courseId) filter.courseId = req.query.courseId;

    if (req.user && req.user.role === "student") {
      const user = await User.findById(req.user.id).select("enrolledCourseIds");
      const enrolled = user ? user.enrolledCourseIds : [];
      if (req.query.courseId) {
        // Asking for a course they are not in → empty list, not an error
        filter.courseId = enrolled.includes(req.query.courseId) ? req.query.courseId : { $in: [] };
      } else {
        filter.courseId = { $in: enrolled };
      }
    }

    const materials = await Material.find(filter).sort({ createdAt: -1 });
    const formatted = materials.map((m) => {
      const obj = m.toObject();
      obj.id = obj._id;
      return obj;
    });
    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch materials", error: error.message });
  }
};

// POST /api/materials
const createMaterial = async (req, res) => {
  try {
    const data = req.body;
    if (data.id && !data._id) data._id = data.id;
    const item = await Material.create(data);
    const obj = item.toObject();
    obj.id = obj._id;
    res.status(201).json(obj);
  } catch (error) {
    res.status(400).json({ message: "Failed to create material", error: error.message });
  }
};

// PUT /api/materials/:id
const updateMaterial = async (req, res) => {
  try {
    const item = await Material.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    if (!item) return res.status(404).json({ message: "Material not found" });
    const obj = item.toObject();
    obj.id = obj._id;
    res.status(200).json(obj);
  } catch (error) {
    res.status(400).json({ message: "Failed to update material", error: error.message });
  }
};

// DELETE /api/materials/:id
const deleteMaterial = async (req, res) => {
  try {
    const item = await Material.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Material not found" });
    res.status(200).json({ message: "Material deleted", id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete material", error: error.message });
  }
};

module.exports = {
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
};
