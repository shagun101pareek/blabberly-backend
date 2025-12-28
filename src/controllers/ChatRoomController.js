import ChatRoom from "../models/chatRoom.js";

export const createChatRoom = async (participants, options = {}) => {
  try {
    // Only prevent duplicates for 1-1 chats
    if (participants.length === 2 && !options.isGroup) {
      const existing = await ChatRoom.findOne({
        participants: { $all: participants },
        $expr: { $eq: [{ $size: "$participants" }, 2] },
      });

      if (existing) return existing;
    }

    const chatRoom = await ChatRoom.create({
      participants,
      isGroup: options.isGroup || false,
      groupName: options.groupName || null,
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
    const userId = req.user; // set by auth middleware

    const rooms = await ChatRoom.find({
      participants: userId,
    })
      .populate("participants", "username email")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      rooms,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching chatrooms",
      error: error.message,
    });
  }
};
