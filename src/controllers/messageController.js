import Message from "../models/message.js";

/**
 * SEND MESSAGE
 */
export const sendMessage = async (req, res) => {
  try {
    const { chatroomId, receiverId, content } = req.body;

    const message = await Message.create({
      chatroom: chatroomId,
      sender: req.user.id,
      receiver: receiverId,
      content,
      status: "sent",
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: "Failed to send message" });
  }
};

/**
 * GET MESSAGES BY CHATROOM
 * Also marks messages as DELIVERED
 */
export const getMessagesByChatroom = async (req, res) => {
  try {
    const { chatroomId } = req.params;
    const userId = req.user.id;

    const messages = await Message.find({ chatroom: chatroomId })
      .sort({ createdAt: 1 });

    // Mark SENT → DELIVERED
    await Message.updateMany(
      {
        chatroom: chatroomId,
        receiver: userId,
        status: "sent",
      },
      {
        status: "delivered",
        deliveredAt: new Date(),
      }
    );

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

/**
 * MARK MESSAGES AS SEEN
 */
export const markMessagesSeen = async (req, res) => {
  try {
    const { chatroomId } = req.body;
    const userId = req.user.id;

    await Message.updateMany(
      {
        chatroom: chatroomId,
        receiver: userId,
        status: { $ne: "seen" },
      },
      {
        status: "seen",
        seenAt: new Date(),
      }
    );

    res.status(200).json({ message: "Messages marked as seen" });
  } catch (error) {
    res.status(500).json({ message: "Failed to mark messages as seen" });
  }
};
