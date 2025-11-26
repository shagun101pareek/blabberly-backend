import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./config/db.js";

// // Health
// app.get('/', (req, res) => res.send('API is running'));

const PORT = process.env.PORT || 5000;

// Connect DB
connectDB();

// Run Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
