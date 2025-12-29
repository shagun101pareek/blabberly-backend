import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

const USER_ID = "694769282129a3d83c133ee4"; // shagun_713
const CHATROOM_ID = "69476f652129a3d83c133f7f";

socket.on("connect", () => {
  console.log("Connected:", socket.id);

  socket.emit("register", USER_ID);

  socket.emit("sendMessage", {
    chatroomId: CHATROOM_ID,
    senderId: USER_ID,
    content: "Hello from socket test"
  });
});

socket.on("messageSent", (msg) => {
  console.log("Message saved:", msg);
});

socket.on("receiveMessage", (msg) => {
  console.log("Message received:", msg);
});
