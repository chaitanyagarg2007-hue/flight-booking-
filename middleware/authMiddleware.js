import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
  // 1. Get the Authorization header: format is "Bearer <token>"
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  // 2. Verify the cryptographic signature
  jwt.verify(token, process.env.JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token." });
    }

    // 3. Attach verified user payload to request
    req.user = decodedUser; // contains { userId, role, email }
    next();
  });
};