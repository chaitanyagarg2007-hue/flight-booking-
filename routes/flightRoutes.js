import express from "express";
import db from "../db.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// --- Route 1: Search for Available Flights (Public) ---
router.post("/search", async (req, res) => {
  const { departure, arrival, date } = req.body;

  if (!departure || !arrival) {
    return res.status(400).json({ message: "Departure and arrival cities are required." });
  }

  let sql = `
    SELECT 
        f.id, f.flight_number, f.price, f.available_seats, f.departure_time,
        al.name AS airline,
        a_dep.city AS departure_city,
        a_arr.city AS arrival_city
    FROM 
        flights f 
    JOIN airlines al ON f.airline_id = al.airline_id
    JOIN airports a_dep ON f.departure_airport_id = a_dep.airport_id
    JOIN airports a_arr ON f.arrival_airport_id = a_arr.airport_id
    WHERE 
        a_dep.city LIKE ? AND a_arr.city LIKE ? 
  `;

  const params = [`%${departure.trim()}%`, `%${arrival.trim()}%`];

  if (date) {
    sql += ` AND DATE(f.departure_time) = ?`;
    params.push(date);
  }

  sql += ` AND f.available_seats > 0 ORDER BY f.price ASC`;

  try {
    const [results] = await db.query(sql, params);
    if (results.length === 0) {
      return res.json({ message: "No flights found matching your criteria.", flights: [] });
    }
    res.json({ message: `${results.length} flights found!`, flights: results });
  } catch (err) {
    console.error("Flight search query error:", err);
    res.status(500).json({ message: "Database search failed." });
  }
});

// --- Route 2: Book a Flight (ACID Transaction + Row Locking + Historical Price Snapshot) ---
router.post("/book", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { flightId, customerName, email, seats } = req.body;

  // Strict Validation (Fix for Issue #2)
  const parsedFlightId = Number(flightId);
  const seatsToBook = Number(seats);

  if (!parsedFlightId || !Number.isInteger(parsedFlightId)) {
    return res.status(400).json({ message: "Invalid or missing Flight ID." });
  }

  if (!Number.isInteger(seatsToBook) || seatsToBook <= 0 || seatsToBook > 9) {
    return res.status(400).json({ message: "Number of seats must be a whole integer between 1 and 9." });
  }

  if (!customerName || !customerName.trim() || !email || !email.trim()) {
    return res.status(400).json({ message: "Customer name and email are required." });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Lock the flight row (FOR UPDATE) to prevent concurrency race conditions
    const [flightRows] = await connection.execute(
      "SELECT id, flight_number, airline_id, departure_airport_id, arrival_airport_id, departure_time, price, available_seats FROM flights WHERE id = ? FOR UPDATE",
      [parsedFlightId]
    );

    // Explicit 404 Check (Fix for Issue #2)
    if (!flightRows || flightRows.length === 0) {
      connection.release();
      return res.status(404).json({ message: "Flight not found or is no longer scheduled." });
    }

    const flightDetails = flightRows[0];
    const availableSeats = flightDetails.available_seats;

    if (availableSeats < seatsToBook) {
      throw new Error(`Insufficient inventory: Only ${availableSeats} seat(s) remaining.`);
    }

    // Calculate permanent price snapshot (Fix for Issue #4)
    const totalPrice = (seatsToBook * parseFloat(flightDetails.price)).toFixed(2);

    // 2. Insert into BOOKINGS table with total_price snapshot
    const [bookingResult] = await connection.execute(
      "INSERT INTO bookings (flight_id, user_id, customer_name, email, seats_booked, total_price, status) VALUES (?, ?, ?, ?, ?, ?, 'CONFIRMED')",
      [parsedFlightId, userId, customerName.trim(), email.trim(), seatsToBook, totalPrice]
    );
    const bookingId = bookingResult.insertId;

    // 3. Atomically decrement seats
    await connection.execute(
      "UPDATE flights SET available_seats = available_seats - ? WHERE id = ?",
      [seatsToBook, parsedFlightId]
    );

    await connection.commit();
    connection.release();

    // 4. Fetch enriched ticket details
    const [ticketDetailsRows] = await db.query(
      `SELECT 
          f.flight_number, f.departure_time, al.name AS airline, 
          a_dep.city AS departure_city, a_arr.city AS arrival_city
       FROM flights f
       JOIN airlines al ON f.airline_id = al.airline_id
       JOIN airports a_dep ON f.departure_airport_id = a_dep.airport_id
       JOIN airports a_arr ON f.arrival_airport_id = a_arr.airport_id
       WHERE f.id = ?`,
      [parsedFlightId]
    );

    const finalTicket = ticketDetailsRows[0];

    res.json({
      message: "✅ Reservation confirmed successfully!",
      ticket: {
        booking_id: bookingId,
        customer_name: customerName,
        email: email,
        seats_booked: seatsToBook,
        price_paid: totalPrice,
        flight_number: finalTicket.flight_number,
        airline: finalTicket.airline,
        departure_city: finalTicket.departure_city,
        arrival_city: finalTicket.arrival_city,
        departure_time: finalTicket.departure_time,
        flight_id: parsedFlightId
      }
    });

  } catch (error) {
    if (connection) await connection.rollback();
    if (connection) connection.release();
    console.error("Booking Transaction Failed:", error.message);
    res.status(500).json({ message: `Booking failed: ${error.message}` });
  }
});

// --- Route 3: Cancel a Booking (Soft-Cancellation + Inventory Restore) ---
router.post("/cancel", authenticateToken, async (req, res) => {
  const { bookingId } = req.body;
  const userId = req.user.userId;
  const userRole = req.user.role;

  const parsedBookingId = Number(bookingId);
  if (!parsedBookingId || !Number.isInteger(parsedBookingId)) {
    return res.status(400).json({ message: "Invalid booking ID." });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [bookingRows] = await connection.execute(
      "SELECT id, flight_id, user_id, seats_booked, status FROM bookings WHERE id = ? FOR UPDATE",
      [parsedBookingId]
    );

    if (bookingRows.length === 0) {
      connection.release();
      return res.status(404).json({ message: "Booking record not found." });
    }

    const booking = bookingRows[0];

    // Authorization: only the owner or an admin can cancel
    if (booking.user_id !== userId && userRole !== "admin") {
      connection.release();
      return res.status(403).json({ message: "Unauthorized: You cannot cancel another passenger's booking." });
    }

    // Idempotency: Prevent double cancellation
    if (booking.status === "CANCELLED") {
      connection.release();
      return res.status(400).json({ message: "This reservation has already been cancelled." });
    }

    // Restore seats to flight inventory
    await connection.execute(
      "UPDATE flights SET available_seats = available_seats + ? WHERE id = ?",
      [booking.seats_booked, booking.flight_id]
    );

    // Soft-cancel: update status & record cancellation timestamp
    await connection.execute(
      "UPDATE bookings SET status = 'CANCELLED', cancelled_at = NOW() WHERE id = ?",
      [parsedBookingId]
    );

    await connection.commit();
    connection.release();

    res.json({
      message: `Booking #${parsedBookingId} cancelled. ${booking.seats_booked} seat(s) restored to flight inventory.`,
      bookingId: parsedBookingId,
      status: "CANCELLED"
    });

  } catch (error) {
    if (connection) await connection.rollback();
    if (connection) connection.release();
    console.error("Cancellation Transaction Failed:", error.message);
    res.status(500).json({ message: `Cancellation failed: ${error.message}` });
  }
});

// --- Route 4: Get User Booking History ---
router.get("/history", authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const sql = `
      SELECT 
          b.id AS booking_id,
          b.booking_date,
          b.cancelled_at,
          b.seats_booked,
          b.total_price,
          b.status,
          f.flight_number,
          f.departure_time,
          al.name AS airline,
          a_dep.city AS departure_city,
          a_arr.city AS arrival_city
      FROM bookings b
      JOIN flights f ON b.flight_id = f.id
      JOIN airlines al ON f.airline_id = al.airline_id
      JOIN airports a_dep ON f.departure_airport_id = a_dep.airport_id
      JOIN airports a_arr ON f.arrival_airport_id = a_arr.airport_id
      WHERE b.user_id = ?
      ORDER BY b.booking_date DESC
    `;
    const [results] = await db.query(sql, [userId]);

    res.json({
      message: `Found ${results.length} bookings.`,
      history: results
    });
  } catch (error) {
    console.error("History retrieval error:", error);
    res.status(500).json({ message: "Failed to retrieve booking history." });
  }
});

export default router;