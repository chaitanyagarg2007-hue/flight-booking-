import express from "express";
import cors from "cors";
import flightRoutes from "./routes/flightRoutes.js";
import authRoutes from "./routes/authRoutes.js"; // NEW IMPORT

const app = express();

app.use(cors()); 
app.use(express.json()); 
app.use(express.static("public")); 

// NEW: Use Authentication Routes
app.use("/api/auth", authRoutes); 
// Use Flight Routes
app.use("/api", flightRoutes);

app.listen(5000, () => {
  console.log("🚀 Flight Booking Server running on port 5000");
});