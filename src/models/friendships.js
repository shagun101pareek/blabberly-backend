import mongoose from "mongoose";

const friendshipSchema = new mongoose.Schema(
  {
    user1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    user2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate friendships (user1-user2 OR user2-user1)
friendshipSchema.index(
  { user1: 1, user2: 1 },
  { unique: true }
);

friendshipSchema.index(
  { user2: 1, user1: 1 },
  { unique: true }
);

const Friendship = mongoose.model("Friendship", friendshipSchema);
export default Friendship;
