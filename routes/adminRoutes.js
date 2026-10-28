import express from "express";
import db from "../db.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

// Enforce both Authentication and Admin Role
router.use(authenticateToken, requireAdmin);

// --- 1. Get System Analytics & Business Stats (Accurate Historical Revenue) ---
router.get("/stats", async (req, res) => {
  try {
    // Uses b.total_price (stored snapshot) instead of joining f.price (Fix for Issue #4)
    const statsQuery = `
      SELECT 
        COUNT(*) AS total_bookings,
        SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmed_bookings,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled_bookings,
        COALESCE(SUM(CASE WHEN status = 'CONFIRMED' THEN b.total_price ELSE 0 END), 0) AS total_revenue
      FROM bookings b;
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
        b.total_price,
        b.status,
        b.booking_date,
        b.cancelled_at,
        f.flight_number,
        al.name AS airline,
        a_dep.city AS departure_city,
        a_arr.city AS arrival_city
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

// --- 3. Get All Flights for Admin Management ---
router.get("/flights", async (req, res) => {
  try {
    const sql = `
      SELECT 
        f.id, f.flight_number, f.price, f.available_seats, f.departure_time, f.arrival_time,
        al.name AS airline,
        a_dep.city AS departure_city,
        a_arr.city AS arrival_city
      FROM flights f
      JOIN airlines al ON f.airline_id = al.airline_id
      JOIN airports a_dep ON f.departure_airport_id = a_dep.airport_id
      JOIN airports a_arr ON f.arrival_airport_id = a_arr.airport_id
      ORDER BY f.departure_time ASC;
    `;
    const [flights] = await db.query(sql);
    res.json({ flights });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch flights list." });
  }
});

// --- 4. Create a New Flight (Admin Only) ---
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

  if (departure_airport_id === arrival_airport_id) {
    return res.status(400).json({ message: "Departure and arrival airports cannot be identical." });
  }

  if (new Date(departure_time) >= new Date(arrival_time)) {
    return res.status(400).json({ message: "Arrival time must be chronologically after departure time." });
  }

  if (parseFloat(price) <= 0 || parseInt(available_seats) < 0) {
    return res.status(400).json({ message: "Price and seats must be valid positive values." });
  }

  try {
    const [existing] = await db.query("SELECT id FROM flights WHERE flight_number = ?", [flight_number.toUpperCase().trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ message: `Flight ${flight_number} already exists in the system.` });
    }

    const [result] = await db.query(
      `INSERT INTO flights 
       (flight_number, airline_id, departure_airport_id, arrival_airport_id, departure_time, arrival_time, price, available_seats) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        flight_number.toUpperCase().trim(),
        parseInt(airline_id),
        parseInt(departure_airport_id),
        parseInt(arrival_airport_id),
        departure_time,
        arrival_time,
        parseFloat(price),
        parseInt(available_seats)
      ]
    );

    res.status(201).json({
      message: `Flight ${flight_number} successfully scheduled!`,
      flightId: result.insertId
    });

  } catch (error) {
    console.error("Create Flight Error:", error);
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ message: "Invalid airline or airport ID provided." });
    }
    res.status(500).json({ message: "Failed to schedule flight." });
  }
});

// --- 5. Update Flight Price or Available Seats (Admin Only) ---
router.patch("/flights/:id", async (req, res) => {
  const flightId = Number(req.params.id);
  const { price, available_seats } = req.body;

  if (!flightId || !Number.isInteger(flightId)) {
    return res.status(400).json({ message: "Invalid flight ID." });
  }

  if (price === undefined && available_seats === undefined) {
    return res.status(400).json({ message: "Provide at least price or available_seats to update." });
  }

  try {
    const [flightRows] = await db.query("SELECT id FROM flights WHERE id = ?", [flightId]);
    if (flightRows.length === 0) {
      return res.status(404).json({ message: "Flight not found." });
    }

    const updates = [];
    const params = [];

    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) return res.status(400).json({ message: "Price must be positive." });
      updates.push("price = ?");
      params.push(parsedPrice);
    }

    if (available_seats !== undefined) {
      const parsedSeats = parseInt(available_seats);
      if (isNaN(parsedSeats) || parsedSeats < 0) return res.status(400).json({ message: "Seats cannot be negative." });
      updates.push("available_seats = ?");
      params.push(parsedSeats);
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