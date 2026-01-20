import dotenv from "dotenv";
import connectDB from "../src/config/db.js";
import User from "../src/models/user.js";

dotenv.config();

const runMigration = async () => {
  try {
    await connectDB();

    await User.updateMany(
      { followers: { $exists: false } },
      { $set: { followers: [], following: [] } }
    );

    console.log("Migration completed: followers and following initialized for existing users.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

runMigration();


