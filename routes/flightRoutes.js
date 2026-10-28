import express from "express";
import db from "../db.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// --- Route 1: Search for Available Flights (No Auth Required) ---
router.post("/search", async (req, res) => {
  // ... (Search logic remains the same) ...
  const { departure, arrival, date } = req.body;
  // ... (Input validation and sanitization) ...
  
  // Final SQL Query
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
  // ... (Rest of search logic) ...
  
  const params = [`%${departure.trim()}%`, `%${arrival.trim()}%`]; 

  if (date) {
    sql += ` AND DATE(f.departure_time) = ?`;
    params.push(date); 
  }
  
  sql += ` AND f.available_seats > 0 ORDER BY f.price ASC`;

  try {
    const [results] = await db.query(sql, params);
    // ... (Error handling and response) ...
    if (results.length === 0) {
      return res.json({ message: "No flights found matching your criteria.", flights: [] });
    }
    res.json({ message: `${results.length} flights found!`, flights: results });
  } catch (err) {
    console.error("Error executing flight search query:", err);
    res.status(500).json({ message: "Database search failed." });
  }
});

// --- Route 2: Book a Flight (Auth Required + User ID linked) ---
router.post("/book", authenticateToken,async (req, res) => {
    const userId = req.user.userId;
    const { flightId, customerName, email, seats} = req.body; // NEW: userId is received
    const seatsToBook = parseInt(seats);

    if (!flightId || !customerName || !email || seatsToBook <= 0 || !userId) { // Check for userId
        return res.status(400).json({ message: "Invalid booking details." });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Lock the flight row and check availability
        const [flightRows] = await connection.execute(
            "SELECT id, flight_number, airline_id, departure_airport_id, arrival_airport_id, departure_time, price, available_seats FROM flights WHERE id = ? FOR UPDATE",
            [flightId]
        );
        // ... (Availability and Seat check logic) ...
        const flightDetails = flightRows[0];
        const availableSeats = flightDetails.available_seats;
        if (availableSeats < seatsToBook) throw new Error(`Only ${availableSeats} seats remaining.`);


        // 2. Insert into BOOKINGS table (Link booking to user_id)
        const [bookingResult] = await connection.execute(
            "INSERT INTO bookings (flight_id, user_id, customer_name, email, seats_booked) VALUES (?, ?, ?, ?, ?)",
            [flightId, userId, customerName, email, seatsToBook] // NEW: userId added
        );
        const bookingId = bookingResult.insertId;

        // 3. Update FLIGHTS seat count
        await connection.execute(
            "UPDATE flights SET available_seats = available_seats - ? WHERE id = ?",
            [seatsToBook, flightId]
        );

        await connection.commit(); // atomicity commit
        connection.release();

        // 4. Fetch details for ticket generation
        const [ticketDetailsRows] = await db.query(`
            SELECT 
                f.flight_number, f.departure_time, f.price, al.name AS airline, 
                a_dep.city AS departure_city, a_arr.city AS arrival_city
            FROM flights f
            JOIN airlines al ON f.airline_id = al.airline_id
            JOIN airports a_dep ON f.departure_airport_id = a_dep.airport_id
            JOIN airports a_arr ON f.arrival_airport_id = a_arr.airport_id
            WHERE f.id = ?
        `, [flightId]);

        const finalTicketDetails = ticketDetailsRows[0];
        res.json({ 
            message: "✅ Booking successful!",
            ticket: {
                booking_id: bookingId,
                customer_name: customerName,
                email: email,
                seats_booked: seatsToBook,
                // ... (rest of ticket data) ...
                flight_number: finalTicketDetails.flight_number,
                airline: finalTicketDetails.airline,
                departure_city: finalTicketDetails.departure_city,
                arrival_city: finalTicketDetails.arrival_city,
                departure_time: finalTicketDetails.departure_time,
                price_paid: (seatsToBook * parseFloat(finalTicketDetails.price)).toFixed(2),
                flight_id: flightId 
            }
        });

    } catch (error) {
        // ... (Rollback and error handling) ...
        if (connection) await connection.rollback(); // atomicity rollback
        if (connection) connection.release();
        console.error("Booking Transaction Failed:", error.message);
        res.status(500).json({ message: `❌ Booking failed: ${error.message}` });
    }
});

// --- Route 3: Cancel a Booking (Status Update + Seat Restore) ---
router.post("/cancel", authenticateToken, async (req, res) => {
  const { bookingId } = req.body;
  const userId = req.user.userId;
  const userRole = req.user.role;

  if (!bookingId) {
    return res.status(400).json({ message: "Invalid booking ID for cancellation." });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Fetch booking with row locking
    const [bookingRows] = await connection.execute(
      "SELECT id, flight_id, user_id, seats_booked, status FROM bookings WHERE id = ? FOR UPDATE",
      [bookingId]
    );

    if (bookingRows.length === 0) {
      connection.release();
      return res.status(404).json({ message: "Booking ID not found." });
    }

    const booking = bookingRows[0];

    // 2. Ownership verification: User can only cancel their OWN booking (unless admin)
    if (booking.user_id !== userId && userRole !== "admin") {
      connection.release();
      return res.status(403).json({ message: "Unauthorized: You cannot cancel another user's booking." });
    }

    // 3. Edge Case: Prevent double-cancellation
    if (booking.status === "CANCELLED") {
      connection.release();
      return res.status(400).json({ message: "This booking has already been cancelled." });
    }

    // 4. Return seats to the flight inventory
    await connection.execute(
      "UPDATE flights SET available_seats = available_seats + ? WHERE id = ?",
      [booking.seats_booked, booking.flight_id]
    );

    // 5. Soft-cancel: Update status and set cancellation timestamp
    await connection.execute(
      "UPDATE bookings SET status = 'CANCELLED', cancelled_at = NOW() WHERE id = ?",
      [bookingId]
    );

    await connection.commit();
    connection.release();

    res.json({
      message: `Booking #${bookingId} successfully cancelled. ${booking.seats_booked} seat(s) restored to flight.`,
      bookingId,
      status: "CANCELLED"
    });

  } catch (error) {
    if (connection) await connection.rollback();
    if (connection) connection.release();
    console.error("Cancellation Transaction Failed:", error.message);
    res.status(500).json({ message: `Cancellation failed: ${error.message}` });
  }
});

// --- Route 4: Get User History (NEW) ---
// --- Route 4: Get User History ---
router.get("/history", authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const sql = `
        SELECT 
            b.id AS booking_id,
            b.booking_date,
            b.cancelled_at,
            b.seats_booked,
            b.status,
            f.flight_number,
            f.departure_time,
            al.name AS airline,
            a_dep.city AS departure_city,
            a_arr.city AS arrival_city
        FROM 
            bookings b
        JOIN 
            flights f ON b.flight_id = f.id
        JOIN 
            airlines al ON f.airline_id = al.airline_id
        JOIN 
            airports a_dep ON f.departure_airport_id = a_dep.airport_id
        JOIN 
            airports a_arr ON f.arrival_airport_id = a_arr.airport_id
        WHERE 
            b.user_id = ?
        ORDER BY
            b.booking_date DESC
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