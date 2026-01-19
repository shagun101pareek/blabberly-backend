import Message from "../models/message.js";
import ChatRoom from "../models/chatRoom.js";
import { createChatRoom } from "./ChatRoomController.js";
import { getIO } from "../socket/socket.js";
import path from "path";

/**
 * SEND MESSAGE
 * + updates chat lastMessage
 * + increments unread counts
 */
export const sendMessage = async (req, res) => {
  try {
    const { chatroomId, receiverId, content } = req.body;
    const senderId = req.user.id;

    // 1️⃣ Create message
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
 * Also marks SENT → DELIVERED
 */
export const getMessagesByChatroom = async (req, res) => {
  try {
    const { chatroomId } = req.params;
    const userId = req.user.id;

    const messages = await Message.find({ chatroom: chatroomId })
      .sort({ createdAt: 1 });

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
    console.error("❌ getMessagesByChatroom error:", error.message);
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
    console.error("❌ markMessagesSeen error:", error.message);
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
    
    // Store full URL for images, relative path for PDFs
    const PORT = process.env.PORT || 5000;
    const fileUrl = isImage 
      ? `http://localhost:${PORT}/uploads/messages/${file.filename}`
      : `/uploads/messages/${file.filename}`;

    // Save ONLY ONE message with correct type and full URL
    const message = await Message.create({
      chatroom: chatroomId,
      sender: senderId,
      receiver: receiverId,
      type: messageType,
      content: fileUrl, // Full URL for images, relative path for PDFs
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
    // Use image URL for images, simple text for PDFs
    const lastMessageText = isImage ? fileUrl : "📄 Document";
    
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

/**
 * UPLOAD IMAGE MESSAGE
 * WhatsApp-style image messaging endpoint
 * Saves ONLY ONE message with type: "image" and full URL
 */
export const uploadImageMessage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const { receiverId } = req.body;
    const senderId = req.user.id;

    if (!receiverId) {
      return res.status(400).json({ message: "receiverId is required" });
    }

    // Find or create chatroom for sender and receiver
    const chatroom = await createChatRoom([senderId, receiverId]);

    const file = req.file;
    const PORT = process.env.PORT || 5000;
    const imageUrl = `http://localhost:${PORT}/uploads/messages/${file.filename}`;

    // Save ONLY ONE message with type: "image" and full URL
    const message = await Message.create({
      chatroom: chatroom._id,
      sender: senderId,
      receiver: receiverId,
      type: "image",
      content: imageUrl, // Full public URL
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      status: "sent",
    });

    // Update chatroom lastMessage
    const now = new Date();
    chatroom.lastMessage = {
      text: imageUrl, // Use image URL instead of "📷 Photo"
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
      const roomId = String(chatroom._id);
      
      io.to(roomId).emit("receiveMessage", populatedMessage);
      io.to(`user:${receiverId}`).emit("receiveMessage", populatedMessage);

      chatroom.participants.forEach((participantId) => {
        const participantIdStr = participantId.toString();
        io.to(`user:${participantIdStr}`).emit("chatListUpdated", {
          chatroomId: chatroom._id.toString(),
          lastMessage: chatroom.lastMessage,
          lastMessageAt: chatroom.lastMessageAt,
          unreadCount: unreadCounts.get(participantIdStr) || 0,
        });
      });
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Upload image message error:", error);
    res.status(500).json({ message: "Failed to upload image message" });
  }
};
