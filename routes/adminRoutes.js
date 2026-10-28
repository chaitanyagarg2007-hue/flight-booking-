import express from "express";
import db from "../db.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

// Dono middleware ek sath apply honge: Pehle Login check (JWT), fir Admin check (Role)
router.use(authenticateToken, requireAdmin);

// --- 1. Get System Analytics & Business Stats ---
router.get("/stats", async (req, res) => {
  try {
    // Advanced SQL Aggregations: COUNT, SUM, CASE WHEN
    const statsQuery = `
      SELECT 
        COUNT(*) AS total_bookings,
        SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmed_bookings,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_bookings,
        COALESCE(SUM(CASE WHEN status = 'CONFIRMED' THEN (b.seats_booked * f.price) ELSE 0 END), 0) AS total_revenue
      FROM bookings b
      JOIN flights f ON b.flight_id = f.id;
    `;

    const userCountQuery = `SELECT COUNT(*) AS total_users FROM users WHERE role = 'user';`;

    const [[bookingStats]] = await db.query(statsQuery);
    const [[userStats]] = await db.query(userCountQuery);

    res.json({
      overview: {
        totalBookings: bookingStats.total_bookings || 0,
        confirmedBookings: bookingStats.confirmed_bookings || 0,
        cancelledBookings: bookingStats.cancelled_bookings || 0,
        totalRevenue: parseFloat(bookingStats.total_revenue).toFixed(2),
        totalCustomers: userStats.total_users || 0
      }
    });

  } catch (error) {
    console.error("Admin Stats Error:", error);
    res.status(500).json({ message: "Failed to fetch admin stats." });
  }
});

// --- 2. Get All Bookings Across All Customers ---
router.get("/bookings", async (req, res) => {
  try {
    const sql = `
      SELECT 
        b.id AS booking_id,
        b.customer_name,
        b.email AS customer_email,
        b.seats_booked,
        b.status,
        b.booking_date,
        b.cancelled_at,
        f.flight_number,
        al.name AS airline,
        a_dep.city AS departure_city,
        a_arr.city AS arrival_city,
        (b.seats_booked * f.price) AS total_price
      FROM bookings b
      JOIN flights f ON b.flight_id = f.id
      JOIN airlines al ON f.airline_id = al.airline_id
      JOIN airports a_dep ON f.departure_airport_id = a_dep.airport_id
      JOIN airports a_arr ON f.arrival_airport_id = a_arr.airport_id
      ORDER BY b.booking_date DESC;
    `;

    const [allBookings] = await db.query(sql);

    res.json({
      count: allBookings.length,
      bookings: allBookings
    });

  } catch (error) {
    console.error("Admin All Bookings Error:", error);
    res.status(500).json({ message: "Failed to fetch all bookings." });
  }
});

// --- 3. Create a New Flight (Admin Only) ---
router.post("/flights", async (req, res) => {
  const {
    flight_number,
    airline_id,
    departure_airport_id,
    arrival_airport_id,
    departure_time,
    arrival_time,
    price,
    available_seats
  } = req.body;

  // Basic Validation
  if (
    !flight_number ||
    !airline_id ||
    !departure_airport_id ||
    !arrival_airport_id ||
    !departure_time ||
    !arrival_time ||
    price === undefined ||
    available_seats === undefined
  ) {
    return res.status(400).json({ message: "All flight fields are required." });
  }

  // Business Logic Validations
  if (departure_airport_id === arrival_airport_id) {
    return res.status(400).json({ message: "Departure and arrival airports cannot be the same." });
  }

  if (new Date(departure_time) >= new Date(arrival_time)) {
    return res.status(400).json({ message: "Arrival time must be after departure time." });
  }

  if (parseFloat(price) <= 0 || parseInt(available_seats) <= 0) {
    return res.status(400).json({ message: "Price and seats must be greater than zero." });
  }

  try {
    // Check if flight number is already taken (UNIQUE constraint)
    const [existing] = await db.query("SELECT id FROM flights WHERE flight_number = ?", [flight_number]);
    if (existing.length > 0) {
      return res.status(409).json({ message: `Flight number ${flight_number} already exists.` });
    }

    // Insert new flight
    const [result] = await db.query(
      `INSERT INTO flights 
       (flight_number, airline_id, departure_airport_id, arrival_airport_id, departure_time, arrival_time, price, available_seats) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        flight_number.toUpperCase().trim(),
        airline_id,
        departure_airport_id,
        arrival_airport_id,
        departure_time,
        arrival_time,
        price,
        available_seats
      ]
    );

    res.status(201).json({
      message: `Flight ${flight_number} successfully scheduled!`,
      flightId: result.insertId
    });

  } catch (error) {
    console.error("Create Flight Error:", error);
    // Foreign key failure catch (e.g., invalid airline_id or airport_id)
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ message: "Invalid airline or airport ID provided." });
    }
    res.status(500).json({ message: "Failed to create flight." });
  }
});

// --- 4. Update Flight Price or Seats (Admin Only) ---
router.patch("/flights/:id", async (req, res) => {
  const flightId = req.params.id;
  const { price, available_seats } = req.body;

  if (price === undefined && available_seats === undefined) {
    return res.status(400).json({ message: "Provide at least price or available_seats to update." });
  }

  try {
    // Check if flight exists
    const [flightRows] = await db.query("SELECT id FROM flights WHERE id = ?", [flightId]);
    if (flightRows.length === 0) {
      return res.status(404).json({ message: "Flight not found." });
    }

    // Dynamic SQL Query Builder: sirf wahi update karo jo body mein aaya ho
    const updates = [];
    const params = [];

    if (price !== undefined) {
      if (parseFloat(price) <= 0) return res.status(400).json({ message: "Price must be positive." });
      updates.push("price = ?");
      params.push(price);
    }

    if (available_seats !== undefined) {
      if (parseInt(available_seats) < 0) return res.status(400).json({ message: "Seats cannot be negative." });
      updates.push("available_seats = ?");
      params.push(available_seats);
    }

    params.push(flightId);

    const updateSql = `UPDATE flights SET ${updates.join(", ")} WHERE id = ?`;
    await db.query(updateSql, params);

    res.json({
      message: `Flight #${flightId} updated successfully.`,
      updatedFields: { price, available_seats }
    });

  } catch (error) {
    console.error("Update Flight Error:", error);
    res.status(500).json({ message: "Failed to update flight." });
  }
});
export default router;
