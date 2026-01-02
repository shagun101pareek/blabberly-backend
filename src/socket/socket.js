import { Server } from "socket.io";
import Message from "../models/message.js";
import Chatroom from "../models/chatRoom.js";

const userSocketMap = new Map(); // userId -> socketId

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {

    // 1️⃣ User registers socket
    socket.on("register", (userId) => {
      userSocketMap.set(userId, socket.id);
    });

    // 2️⃣ Send message
    socket.on("sendMessage", async ({ chatroomId, senderId, content }) => {
      try {
        const message = await Message.create({
          chatroom: chatroomId,
          sender: senderId,
          content,
        });

        await Chatroom.findByIdAndUpdate(chatroomId, {
          lastMessage: message._id,
          updatedAt: new Date(),
        });

        const chatroom = await Chatroom.findById(chatroomId);
        const receiverId = chatroom.participants.find(
          (id) => id.toString() !== senderId
        );

        const receiverSocketId = userSocketMap.get(receiverId?.toString());

        // Send to receiver
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receiveMessage", message);
        }

        // Ack sender
        socket.emit("messageSent", message);
      } catch (err) {
        socket.emit("messageError", "Message failed");
      }
    });

    socket.on("disconnect", () => {
      for (let [userId, socketId] of userSocketMap.entries()) {
        if (socketId === socket.id) {
          userSocketMap.delete(userId);
          break;
        }
      }
    });
  });
};
