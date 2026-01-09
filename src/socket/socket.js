import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "../models/message.js";
import Chatroom from "../models/chatRoom.js";
import { markOnline, markOffline } from "../controllers/userStatusController.js";

/**
 * Track:
 * - how many sockets a user has (multi-tab support)
 * - which socket belongs to which user (direct delivery)
 */
const onlineUsers = new Map();      // userId -> socketCount
const userSocketMap = new Map();    // userId -> socketId

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
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
       (CRITICAL FOR DIRECT EMIT)
    ========================== */
    userSocketMap.set(userId, socket.id);

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
       SEND MESSAGE
       (ROOM + DIRECT DELIVERY)
    ========================== */
    socket.on("sendMessage", async ({ chatroomId, content }) => {
      try {
        if (!chatroomId || !content) {
          throw new Error("chatroomId and content are required");
        }

        const chatroom = await Chatroom.findById(chatroomId);
        if (!chatroom) {
          throw new Error("Chatroom not found");
        }

        const receiverId = chatroom.participants.find(
          (id) => id.toString() !== userId
        )?.toString();

        if (!receiverId) {
          throw new Error("Receiver not found");
        }

        // Save message
        const message = await Message.create({
          chatroom: chatroomId,
          sender: userId,
          receiver: receiverId,
          content,
          status: "sent",
        });

        // Update chatroom metadata
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

        /* =========================
           1️⃣ EMIT TO CHAT ROOM
        ========================== */
        io.to(roomId).emit("receiveMessage", populatedMessage);

        /* =========================
           2️⃣ DIRECT EMIT TO RECEIVER
           (GUARANTEED DELIVERY)
        ========================== */
        const receiverSocketId = userSocketMap.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receiveMessage", populatedMessage);
        }

        console.log(
          `📨 Message sent from ${userId} → ${receiverId} (room + direct)`
        );
      } catch (err) {
        console.error("❌ Message send failed:", err.message);
        socket.emit("messageError", "Message failed");
      }
    });

    /* =========================
       DISCONNECT
    ========================== */
    socket.on("disconnect", async () => {
      console.log(`🔴 SOCKET DISCONNECTED: user=${userId}, socket=${socket.id}`);

      // Cleanup socket mapping
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