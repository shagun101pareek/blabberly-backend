import jwt from "jsonwebtoken";

/**
 * Authentication Middleware
 * Verifies JWT token from Authorization header
 * Attaches user ID to request object if valid
 */
const authMiddleware = (req, res, next) => {
  // Extract token from Authorization header
  const authHeader = req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  // Check if token exists
  if (!token) {
    return res.status(401).json({ 
      message: "No token, authorization denied" 
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach normalized user object to request
    req.user = { _id: decoded.id, id: decoded.id }; // ensure _id is always available
    req.userId = decoded.id; // alternative access pattern

    // Continue to next middleware/route handler
    next();
  } catch (error) {
    // Token is invalid or expired
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ 
        message: "Token has expired" 
      });
    }
    
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ 
        message: "Invalid token" 
      });
    }

    // Generic error
    return res.status(401).json({ 
      message: "Invalid token" 
    });
  }
};

export const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { _id: decoded.id, id: decoded.id }; // ensure _id is always available
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default authMiddleware;

