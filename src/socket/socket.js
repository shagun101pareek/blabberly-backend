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
    socket.on("sendMessage", async ({ chatroomId, senderId, receiverId, content }) => {
      try {
        // If receiverId not provided, find it from chatroom participants
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

        // Send to receiver
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receiveMessage", message);
        }

        // Ack sender
        socket.emit("messageSent", message);
      } catch (err) {
        console.error("Error sending message via WebSocket:", err);
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
