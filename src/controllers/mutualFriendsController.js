import Friendship from "../models/friendships.js";
import User from "../models/user.js";

export const getMutualFriends = async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;

    // Step 1: Get friends of user A
    const userFriends = await Friendship.find({
      $or: [{ user1: userId }, { user2: userId }],
    });

    const userFriendIds = userFriends.map((f) =>
      f.user1.toString() === userId ? f.user2.toString() : f.user1.toString()
    );

    // Step 2: Get friends of user B
    const otherUserFriends = await Friendship.find({
      $or: [{ user1: otherUserId }, { user2: otherUserId }],
    });

    const otherUserFriendIds = otherUserFriends.map((f) =>
      f.user1.toString() === otherUserId
        ? f.user2.toString()
        : f.user1.toString()
    );

    // Step 3: Find intersection
    const mutualFriendIds = userFriendIds.filter((id) =>
      otherUserFriendIds.includes(id)
    );

    // Step 4: Fetch user details
    const mutualFriends = await User.find(
      { _id: { $in: mutualFriendIds } },
      "username firstName lastName"
    );

    res.json({
      count: mutualFriends.length,
      mutualFriends,
    });
  } catch (err) {
    console.error("Mutual friends error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
