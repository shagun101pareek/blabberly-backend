import ChatRoom from "../models/chatRoom.js";

export const createChatRoom = async (user1, user2) => {
  try {
    // avoid duplicate chatrooms
    let existing = await ChatRoom.findOne({
      participants: { $all: [user1, user2] }
    });

    if (existing) return existing;

    const chatRoom = await ChatRoom.create({
      participants: [user1, user2],
    });

    return chatRoom;
  } catch (error) {
    console.log("Error creating chatroom:", error);
    throw error;
  }
};

// Optional - get all chatrooms of a user
export const getUserChatRooms = async (req, res) => {
  try {
    const rooms = await ChatRoom.find({
      participants: req.user._id,
    });

    res.status(200).json({ rooms });
  } catch (error) {
    res.status(500).json({ message: "Error fetching chatrooms", error });
  }
};
