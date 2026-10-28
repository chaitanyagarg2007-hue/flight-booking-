export const requireAdmin = (req, res, next) => {
  // authMiddleware ne pehle hi req.user set kar diya hai
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Access forbidden: Admin privileges required."
    });
  }

  // User is admin, proceed to the controller
  next();
};