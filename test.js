const express = require("express");
const app = express();

app.use(express.json()); // Middleware to parse JSON body

// GET route
app.get("/", (req, res) => {
  res.json({ message: "GET request successful!" });
});

// POST route
app.post("/data", (req, res) => {
  res.json({
    message: "POST request successful!",
    received: req.body
  });
});

// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
