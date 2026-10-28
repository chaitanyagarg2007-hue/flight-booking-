import express from "express";
import cors from "cors";
import flightRoutes from "./routes/flightRoutes.js";
import authRoutes from "./routes/authRoutes.js"; // NEW IMPORT
import adminRoutes from "./routes/adminRoutes.js";

const app = express();

app.use(cors()); 
app.use(express.json()); 
app.use(express.static("public")); 

// NEW: Use Authentication Routes
app.use("/api/auth", authRoutes); 
// Use Flight Routes
app.use("/api", flightRoutes);
// use admin routes
app.use("/api/admin", adminRoutes);

app.listen(5000, () => {
  console.log("🚀 Flight Booking Server running on port 5000");
});