import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "../models/message.js";
import Chatroom from "../models/chatRoom.js";
import { markOnline, markOffline } from "../controllers/userStatusController.js";

// Maps
const userSocketMap = new Map();   // userId -> socketId
const onlineUsers = new Map();     // userId -> socketCount

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

    console.log("🟢 SOCKET CONNECTED FOR USER:", userId);

    /* =========================
       ONLINE STATUS HANDLING
    ========================== */
    const count = onlineUsers.get(userId) || 0;
    onlineUsers.set(userId, count + 1);

    if (count === 0) {
      await markOnline(userId);
    }

    /* =========================
       REGISTER USER SOCKET
    ========================== */
    socket.on("register", () => {
      userSocketMap.set(userId, socket.id);
    });

    /* =========================
       SEND MESSAGE
    ========================== */
    socket.on(
      "sendMessage",
      async ({ chatroomId, senderId, receiverId, content }) => {
        try {
          let finalReceiverId = receiverId;

          if (!finalReceiverId) {
            const chatroom = await Chatroom.findById(chatroomId);
            finalReceiverId = chatroom.participants.find(
              (id) => id.toString() !== senderId
            )?.toString();
          }

          const message = await Message.create({
            chatroom: chatroomId,
            sender: senderId,
            receiver: finalReceiverId,
            content,
            status: "sent",
          });

          await Chatroom.findByIdAndUpdate(chatroomId, {
            lastMessage: message._id,
            updatedAt: new Date(),
          });

          const receiverSocketId = userSocketMap.get(finalReceiverId);

          if (receiverSocketId) {
            io.to(receiverSocketId).emit("receiveMessage", message);
          }

          socket.emit("messageSent", message);
        } catch (err) {
          console.error("❌ WebSocket message error:", err);
          socket.emit("messageError", "Message failed");
        }
      }
    );

    /* =========================
       DISCONNECT HANDLING
    ========================== */
    socket.on("disconnect", async () => {
      console.log("🔴 SOCKET DISCONNECTED FOR USER:", userId);

      // remove from chat socket map
      userSocketMap.delete(userId);

      // online status cleanup
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
