
import Friendship from "../models/friendships.js";


// CREATE FRIENDSHIP
export const createFriendship = async (req, res) => {
  try {
    const { user1, user2 } = req.body;

    if (user1 === user2) {
      return res.status(400).json({ message: "A user cannot friend themselves" });
    }

    const existing = await Friendship.findOne({
      $or: [
        { user1, user2 },
        { user1: user2, user2: user1 }
      ]
    });

    if (existing) {
      return res.status(400).json({ message: "Friendship already exists" });
    }

    const newFriendship = await Friendship.create({ user1, user2 });

    res.status(201).json({
      message: "Friendship created",
      data: newFriendship,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// GET ALL FRIENDSHIPS FOR A USER
export const getFriendships = async (req, res) => {
  try {
    const { userId } = req.params;

    const friendships = await Friendship.find({
      $or: [{ user1: userId }, { user2: userId }],
    })
      .populate("user1", "username firstName lastName")
      .populate("user2", "username firstName lastName");

    res.status(200).json(friendships);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// DELETE FRIENDSHIP
export const deleteFriendship = async (req, res) => {
  try {
    const { user1, user2 } = req.body;

    const deleted = await Friendship.findOneAndDelete({
      $or: [
        { user1, user2 },
        { user1: user2, user2: user1 }
      ]
    });

    if (!deleted) {
      return res.status(404).json({ message: "Friendship not found" });
    }

    res.status(200).json({ message: "Friendship removed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
