import Message from "../models/message.js";
import ChatRoom from "../models/chatRoom.js";
import { getIO } from "../socket/socket.js";
import path from "path";

/**
 * SEND MESSAGE
 */
export const sendMessage = async (req, res) => {
  try {
    const { chatroomId, receiverId, content } = req.body;
    const senderId = req.user.id;

    const message = await Message.create({
      chatroom: chatroomId,
      sender: senderId,
      receiver: receiverId,
      content,
      status: "sent",
    });

    const chatroom = await ChatRoom.findById(chatroomId);
    if (!chatroom) {
      return res.status(404).json({ message: "Chatroom not found" });
    }

    const now = new Date();
    chatroom.lastMessage = {
      text: content,
      sender: senderId,
      createdAt: now,
    };
    chatroom.lastMessageAt = now;

    const unreadCounts = chatroom.unreadCounts || new Map();
    chatroom.participants.forEach((participantId) => {
      const participantIdStr = participantId.toString();
      if (participantIdStr !== senderId) {
        const currentCount = unreadCounts.get(participantIdStr) || 0;
        unreadCounts.set(participantIdStr, currentCount + 1);
      }
    });
    chatroom.unreadCounts = unreadCounts;

    await chatroom.save();

    const io = getIO();
    if (io) {
      chatroom.participants.forEach((participantId) => {
        const participantIdStr = participantId.toString();
        io.to(`user:${participantIdStr}`).emit("chatListUpdated", {
          chatroomId: chatroomId.toString(),
          lastMessage: chatroom.lastMessage,
          lastMessageAt: chatroom.lastMessageAt,
          unreadCount: unreadCounts.get(participantIdStr) || 0,
        });
      });
    }

    res.status(201).json(message);
  } catch (error) {
    console.error("Send message error:", error);
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
 * MARK CHAT AS READ
 * Resets unread count for user in chatroom
 */
export const markChatAsRead = async (req, res) => {
  try {
    const { chatroomId } = req.body;
    const userId = req.user.id;

    const chatroom = await ChatRoom.findById(chatroomId);
    if (!chatroom) {
      return res.status(404).json({ message: "Chatroom not found" });
    }

    if (!chatroom.participants.some((p) => p.toString() === userId)) {
      return res.status(403).json({ message: "Not a participant" });
    }

    const unreadCounts = chatroom.unreadCounts || new Map();
    unreadCounts.set(userId, 0);
    chatroom.unreadCounts = unreadCounts;
    await chatroom.save();

    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit("chatListUpdated", {
        chatroomId: chatroomId.toString(),
        lastMessage: chatroom.lastMessage,
        lastMessageAt: chatroom.lastMessageAt,
        unreadCount: 0,
      });
    }

    res.status(200).json({ message: "Chat marked as read" });
  } catch (error) {
    console.error("Mark chat as read error:", error);
    res.status(500).json({ message: "Failed to mark chat as read" });
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

/**
 * UPLOAD FILE MESSAGE (IMAGE OR PDF)
 */
export const uploadFileMessage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    const { chatroomId, receiverId } = req.body;
    const senderId = req.user.id;

    if (!chatroomId || !receiverId) {
      return res.status(400).json({ message: "chatroomId and receiverId are required" });
    }

    const file = req.file;
    const extName = path.extname(file.originalname).toLowerCase();
    const imageTypes = [".jpeg", ".jpg", ".png", ".gif", ".webp"];
    const isImage = imageTypes.includes(extName);
    const isPdf = extName === ".pdf";

    if (!isImage && !isPdf) {
      return res.status(400).json({ message: "Only images and PDFs are allowed" });
    }

    const messageType = isImage ? "image" : "pdf";
    const fileUrl = `/uploads/messages/${file.filename}`;

    const message = await Message.create({
      chatroom: chatroomId,
      sender: senderId,
      receiver: receiverId,
      type: messageType,
      content: fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      status: "sent",
    });

    const chatroom = await ChatRoom.findById(chatroomId);
    if (!chatroom) {
      return res.status(404).json({ message: "Chatroom not found" });
    }

    const now = new Date();
    const lastMessageText = isImage ? "📷 Photo" : "📄 Document";
    
    chatroom.lastMessage = {
      text: lastMessageText,
      sender: senderId,
      createdAt: now,
    };
    chatroom.lastMessageAt = now;

    const unreadCounts = chatroom.unreadCounts || new Map();
    chatroom.participants.forEach((participantId) => {
      const participantIdStr = participantId.toString();
      if (participantIdStr !== senderId) {
        const currentCount = unreadCounts.get(participantIdStr) || 0;
        unreadCounts.set(participantIdStr, currentCount + 1);
      }
    });
    chatroom.unreadCounts = unreadCounts;

    await chatroom.save();

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "username")
      .populate("receiver", "username");

    const io = getIO();
    if (io) {
      const roomId = String(chatroomId);
      
      io.to(roomId).emit("receiveMessage", populatedMessage);
      
      io.to(`user:${receiverId}`).emit("receiveMessage", populatedMessage);

      chatroom.participants.forEach((participantId) => {
        const participantIdStr = participantId.toString();
        io.to(`user:${participantIdStr}`).emit("chatListUpdated", {
          chatroomId: chatroomId.toString(),
          lastMessage: chatroom.lastMessage,
          lastMessageAt: chatroom.lastMessageAt,
          unreadCount: unreadCounts.get(participantIdStr) || 0,
        });
      });
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Upload file message error:", error);
    res.status(500).json({ message: "Failed to upload file message" });
  }
};
