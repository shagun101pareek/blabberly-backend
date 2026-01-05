import express from "express";
import cors from "cors";

import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import friendRequestRoutes from "./routes/friendRequestRoutes.js";
import friendshipRoutes from "./routes/friendshipRoutes.js";
import chatroomRoutes from "./routes/chatRoutes.js";

import messageRoutes from "./routes/messageRoutes.js";

import path from "path";
import profileRoutes from "./routes/profileRoutes.js";

import userStatusRoutes from "./routes/userStatusRoutes.js";

import mutualFriendsRoutes from "./routes/mutualFriendsRoutes.js";



const app = express();

app.use(cors());
app.use(express.json());

// Public routes
app.use("/api/users", userRoutes);

// Protected routes
app.use("/api/chat", chatRoutes);


app.use("/api/friend/requests", friendRequestRoutes);


app.use("/api/friendships", friendshipRoutes);


app.use("/api/chatrooms", chatroomRoutes);

app.use("/api/messages", messageRoutes);

//user online h ki nahi 
app.use("/api/users", userStatusRoutes);

// Static folder for images
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Profile picture k liye 
app.use("/api/users", profileRoutes);

//Mutual Friends k liye
app.use("/api/users", mutualFriendsRoutes);

export default app;