import Chatroom from "../models/chatRoom.js";
import Message from "../models/message.js";

// Get all chatrooms of logged-in user
export const getChatrooms = async (req, res) => {
  try {
    const userId = req.user.id;

    const chatrooms = await Chatroom.find({
      participants: userId,
    })
      .populate("participants", "username email")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    res.status(200).json(chatrooms);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch chatrooms" });
  }
};

// Get messages of a specific chatroom
export const getMessages = async (req, res) => {
  try {
    const { chatroomId } = req.params;

    const messages = await Message.find({ chatroom: chatroomId })
      .populate("sender", "username")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};
