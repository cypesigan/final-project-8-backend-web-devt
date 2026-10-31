const mongoose = require("mongoose");

mongoose.set("toJSON", { virtuals: true });

let memoryServer = null;

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  const isProduction = process.env.NODE_ENV === "production";

  if (uri) {
    try {
      console.log(`Attempting to connect to MongoDB URI...`);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log("MongoDB connected successfully via MONGO_URI");
      return;
    } catch (error) {
      console.warn("MongoDB connection to MONGO_URI failed:", error.message);
      if (isProduction) {
        console.error("FATAL: Cannot connect to MongoDB");
        process.exit(1);
      }
      console.log("Starting in-memory MongoDB instance as a seamless fallback...");
    }
  } else {
    if (isProduction) {
      console.error("FATAL: Cannot connect to MongoDB (MONGO_URI is missing)");
      process.exit(1);
    }
    console.log("No MONGO_URI provided in .env, initializing in-memory MongoDB instance...");
  }

  try {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    memoryServer = await MongoMemoryServer.create();
    const memUri = memoryServer.getUri();
    await mongoose.connect(memUri);
    console.log(`In-memory MongoDB running and connected at ${memUri}`);
  } catch (memError) {
    console.error("Failed to start in-memory MongoDB:", memError.message);
    process.exit(1);
  }
};

module.exports = connectDB;
