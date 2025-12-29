import dotenv from "dotenv";
import http from "http";
import app from "./app.js";
import { initSocket } from "./socket/socket.js";
dotenv.config();

import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSocket(server);

server.listen(5000, () => {
  console.log("Server running on port 5000");
});

// Connect DB
connectDB();

// Run Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
