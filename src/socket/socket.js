import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "../models/message.js";
import Chatroom from "../models/chatRoom.js";
import { markOnline, markOffline } from "../controllers/userStatusController.js";

/**
 * Track:
 * - online socket count per user (multi-tab support)
 * - socketId per user (direct delivery)
 */
const onlineUsers = new Map();   // userId -> socketCount
const userSocketMap = new Map(); // userId -> socketId
let ioInstance = null;

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: "*" },
  });
  ioInstance = io;

  io.on("connection", async (socket) => {
    /* =========================
       AUTHENTICATE SOCKET
    ========================== */
    let userId;

    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error("No token");

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
      socket.userId = userId;
    } catch (err) {
      console.log("❌ Socket authentication failed");
      socket.disconnect();
      return;
    }

    console.log(`🟢 SOCKET CONNECTED: user=${userId}, socket=${socket.id}`);

    /* =========================
       ONLINE STATUS
    ========================== */
    const count = onlineUsers.get(userId) || 0;
    onlineUsers.set(userId, count + 1);

    if (count === 0) {
      await markOnline(userId);
    }

    /* =========================
       REGISTER USER SOCKET
    ========================== */
    userSocketMap.set(userId, socket.id);
    
    // Join user-specific room for multi-tab support
    socket.join(`user:${userId}`);

    /* =========================
       JOIN CHAT ROOM
       (Reset unread count)
    ========================== */
    socket.on("joinChat", async (chatroomId) => {
      socket.join(String(chatroomId));

      // 🔥 Reset unread count when user opens chat
      await Chatroom.findByIdAndUpdate(chatroomId, {
        $set: {
          [`unreadCounts.${userId}`]: 0,
        },
      });

      console.log(`✅ User ${userId} joined chatroom ${chatroomId}`);
    });

    /* =========================
       LEAVE CHAT ROOM
    ========================== */
    socket.on("leaveChat", (chatroomId) => {
      socket.leave(String(chatroomId));
      console.log(`👋 User ${userId} left chatroom ${chatroomId}`);
    });

    /* =========================
       MESSAGE DELIVERED
    ========================== */
    socket.on("messageDelivered", async ({ messageId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        if (message.receiver.toString() !== socket.userId) return;
        if (message.status !== "sent") return;

        message.status = "delivered";
        message.deliveredAt = new Date();
        await message.save();

        const senderSocketId = userSocketMap.get(
          message.sender.toString()
        );

        if (senderSocketId) {
          io.to(senderSocketId).emit("messageStatusUpdated", {
            messageId,
            status: "delivered",
            deliveredAt: message.deliveredAt,
          });
        }
      } catch (err) {
        console.error("❌ messageDelivered error:", err.message);
      }
    });

    /* =========================
       MESSAGE SEEN
    ========================== */
    socket.on("messageSeen", async ({ chatroomId }) => {
      try {
        const unseenMessages = await Message.find({
          chatroom: chatroomId,
          receiver: socket.userId,
          status: "delivered",
          seenAt: null,
        });

        if (!unseenMessages.length) return;

        const seenAt = new Date();

        await Message.updateMany(
          { _id: { $in: unseenMessages.map(m => m._id) } },
          { $set: { status: "seen", seenAt } }
        );

        unseenMessages.forEach(msg => {
          const senderSocketId = userSocketMap.get(msg.sender.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit("messageStatusUpdated", {
              messageId: msg._id,
              status: "seen",
              seenAt,
            });
          }
        });
      } catch (err) {
        console.error("❌ messageSeen error:", err.message);
      }
    });

    /* =========================
       TYPING INDICATOR
    ========================== */
    socket.on("typing", ({ chatroomId }) => {
      socket.to(String(chatroomId)).emit("typing", {
        userId: socket.userId,
      });
    });

    socket.on("stopTyping", ({ chatroomId }) => {
      socket.to(String(chatroomId)).emit("stopTyping", {
        userId: socket.userId,
      });
    });

    /* =========================
       MARK CHAT AS READ
    ========================== */
    socket.on("markChatAsRead", async ({ chatroomId }) => {
      try {
        if (!chatroomId) return;

        const chatroom = await Chatroom.findById(chatroomId);
        if (!chatroom) return;

        if (!chatroom.participants.some((p) => p.toString() === userId)) {
          return;
        }

        const unreadCounts = chatroom.unreadCounts || new Map();
        unreadCounts.set(userId, 0);
        chatroom.unreadCounts = unreadCounts;
        await chatroom.save();

        io.to(`user:${userId}`).emit("chatListUpdated", {
          chatroomId: chatroomId.toString(),
          lastMessage: chatroom.lastMessage,
          lastMessageAt: chatroom.lastMessageAt,
          unreadCount: 0,
        });

        console.log(`✅ Chat marked as read: ${userId} in ${chatroomId}`);
      } catch (err) {
        console.error("❌ markChatAsRead error:", err.message);
      }
    });

    /* =========================
       SEND MESSAGE
       (🔥 CHAT LIST OPTIMIZED)
    ========================== */
    socket.on("sendMessage", async ({ chatroomId, content }) => {
      try {
        const chatroom = await Chatroom.findById(chatroomId);
        if (!chatroom) throw new Error("Chatroom not found");

        const receiverId = chatroom.participants.find(
          id => id.toString() !== userId
        )?.toString();

        const message = await Message.create({
          chatroom: chatroomId,
          sender: userId,
          receiver: receiverId,
          content,
          status: "sent",
        });

        const now = new Date();
        chatroom.lastMessage = {
          text: content,
          sender: userId,
          createdAt: now,
        };
        chatroom.lastMessageAt = now;

        const unreadCounts = chatroom.unreadCounts || new Map();
        chatroom.participants.forEach((participantId) => {
          const participantIdStr = participantId.toString();
          if (participantIdStr !== userId) {
            const currentCount = unreadCounts.get(participantIdStr) || 0;
            unreadCounts.set(participantIdStr, currentCount + 1);
          }
        });
        chatroom.unreadCounts = unreadCounts;
        await chatroom.save();

        const populatedMessage = await Message.findById(message._id)
          .populate("sender", "username")
          .populate("receiver", "username");

        io.to(String(chatroomId)).emit("receiveMessage", populatedMessage);

        /* 🔥 REAL-TIME CHAT LIST UPDATE */
        chatroom.participants.forEach(id => {
          const socketId = userSocketMap.get(id.toString());
          if (socketId) {
            io.to(socketId).emit("chatListUpdated", {
              chatroomId,
              lastMessage: chatroom.lastMessage,
              updatedAt: chatroom.updatedAt,
              unreadCount: unreadCounts.get(id.toString()) || 0,
            });
          }
        });

        console.log(`📨 Message sent ${userId} → ${receiverId}`);
      } catch (err) {
        console.error("❌ Message send failed:", err.message);
      }
    });

    /* =========================
       DISCONNECT
    ========================== */
    socket.on("disconnect", async () => {
      userSocketMap.delete(userId);

      const currentCount = (onlineUsers.get(userId) || 1) - 1;

      if (currentCount <= 0) {
        onlineUsers.delete(userId);
        await markOffline(userId);
      } else {
        onlineUsers.set(userId, currentCount);
      }

      console.log(`🔴 SOCKET DISCONNECTED: user=${userId}`);
    });
  });
};

export const getIO = () => ioInstance;

