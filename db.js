import mysql from "mysql2/promise"; 

const db = mysql.createPool({ 
  host: "localhost", 
  user: "root",
  password: "1234", 
  database: "flight_booking_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db.getConnection()
  .then(connection => {
    console.log("Database connection successful!");
    connection.release();
  })
  .catch(err => {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  });

export default db;