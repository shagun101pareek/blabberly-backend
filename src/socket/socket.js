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

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: "*" },
  });

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

    /* =========================
       MESSAGE DELIVERED
       (Receiver → Server)
    ========================== */
    socket.on("messageDelivered", async ({ messageId }) => {
      try {
        if (!messageId) return;

        const message = await Message.findById(messageId);
        if (!message) return;

        // 🔥 SECURITY CHECK
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

        console.log(`✔✔ Message delivered: ${messageId}`);
      } catch (err) {
        console.error("❌ messageDelivered error:", err.message);
      }
    });

    /* =========================
       JOIN CHAT ROOM
    ========================== */
    socket.on("joinChat", (chatroomId) => {
      socket.join(String(chatroomId));
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
       MESSAGE SEEN
       (Receiver → Server)
    ========================== */
    socket.on("messageSeen", async ({ chatroomId }) => {
      try {
        if (!chatroomId) return;

        const unseenMessages = await Message.find({
          chatroom: chatroomId,
          receiver: socket.userId,
          status: "delivered",
          seenAt: null,
        });

        if (unseenMessages.length === 0) return;

        const seenAt = new Date();
        const messageIds = unseenMessages.map((m) => m._id);

        await Message.updateMany(
          { _id: { $in: messageIds } },
          {
            $set: {
              status: "seen",
              seenAt,
            },
          }
        );

        unseenMessages.forEach((msg) => {
          const senderSocketId = userSocketMap.get(
            msg.sender.toString()
          );

          if (senderSocketId) {
            io.to(senderSocketId).emit("messageStatusUpdated", {
              messageId: msg._id,
              status: "seen",
              seenAt,
            });
          }
        });

        console.log(`👁️ Messages seen in chat ${chatroomId}`);
      } catch (err) {
        console.error("❌ messageSeen error:", err.message);
      }
    });

    /* =========================
       TYPING INDICATOR
    ========================== */
    socket.on("typing", ({ chatroomId }) => {
      if (!chatroomId) return;

      socket.to(String(chatroomId)).emit("typing", {
        userId: socket.userId,
        chatroomId,
      });
    });

    socket.on("stopTyping", ({ chatroomId }) => {
      if (!chatroomId) return;

      socket.to(String(chatroomId)).emit("stopTyping", {
        userId: socket.userId,
        chatroomId,
      });
    });

    /* =========================
       SEND MESSAGE
    ========================== */
    socket.on("sendMessage", async ({ chatroomId, content }) => {
      try {
        if (!chatroomId || !content) {
          throw new Error("chatroomId and content are required");
        }

        const chatroom = await Chatroom.findById(chatroomId);
        if (!chatroom) throw new Error("Chatroom not found");

        const receiverId = chatroom.participants.find(
          (id) => id.toString() !== userId
        )?.toString();

        if (!receiverId) throw new Error("Receiver not found");

        const message = await Message.create({
          chatroom: chatroomId,
          sender: userId,
          receiver: receiverId,
          content,
          status: "sent",
        });

        await Chatroom.findByIdAndUpdate(chatroomId, {
          lastMessage: {
            text: content,
            sender: userId,
            createdAt: message.createdAt,
          },
          updatedAt: new Date(),
        });

        const populatedMessage = await Message.findById(message._id)
          .populate("sender", "username")
          .populate("receiver", "username");

        const roomId = String(chatroomId);

        // Emit to users in chat
        io.to(roomId).emit("receiveMessage", populatedMessage);

        // Direct emit to receiver
        const receiverSocketId = userSocketMap.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receiveMessage", populatedMessage);
        }

        console.log(`📨 Message sent ${userId} → ${receiverId}`);
      } catch (err) {
        console.error("❌ Message send failed:", err.message);
        socket.emit("messageError", "Message failed");
      }
    });

    /* =========================
       DISCONNECT
    ========================== */
    socket.on("disconnect", async () => {
      console.log(`🔴 SOCKET DISCONNECTED: user=${userId}`);

      userSocketMap.delete(userId);

      const currentCount = (onlineUsers.get(userId) || 1) - 1;

      if (currentCount <= 0) {
        onlineUsers.delete(userId);
        await markOffline(userId);
      } else {
        onlineUsers.set(userId, currentCount);
      }
    });
  });
};
