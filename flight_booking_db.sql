-- DBMS Focused Flight Booking System Schema

-- 1. DATABASE SETUP
DROP DATABASE IF EXISTS flight_booking_db; 
CREATE DATABASE flight_booking_db;
USE flight_booking_db;

-- 2. CORE TABLES FOR NORMALIZATION (Lookups)
CREATE TABLE IF NOT EXISTS airlines (
    airline_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS airports (
    airport_id INT AUTO_INCREMENT PRIMARY KEY,
    city VARCHAR(50) UNIQUE NOT NULL,
    iata_code VARCHAR(3) UNIQUE NOT NULL
) ENGINE=InnoDB;

-- NEW TABLE: USERS for Authentication
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- In real life, use hashed passwords (Bcrypt)
    role ENUM('user', 'admin') DEFAULT 'user',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. FLIGHTS Table 
CREATE TABLE IF NOT EXISTS flights (
    id INT AUTO_INCREMENT PRIMARY KEY,
    flight_number VARCHAR(10) UNIQUE NOT NULL,
    airline_id INT NOT NULL, 
    departure_airport_id INT NOT NULL, 
    arrival_airport_id INT NOT NULL, 
    departure_time DATETIME NOT NULL,
    arrival_time DATETIME NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    available_seats INT NOT NULL,
    
    FOREIGN KEY (airline_id) REFERENCES airlines(airline_id),
    FOREIGN KEY (departure_airport_id) REFERENCES airports(airport_id),
    FOREIGN KEY (arrival_airport_id) REFERENCES airports(airport_id)
) ENGINE=InnoDB; 

-- 4. BOOKINGS Table (Link to User)
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    flight_id INT NOT NULL,
    user_id INT NOT NULL, -- NEW FOREIGN KEY
    customer_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    seats_booked INT NOT NULL,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (flight_id) REFERENCES flights(id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) -- NEW CONSTRAINT
) ENGINE=InnoDB;

-- 5. WARNINGS Table (For Trigger Demonstration)
CREATE TABLE IF NOT EXISTS seat_warnings (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    flight_id INT NOT NULL,
    flight_number VARCHAR(10) NOT NULL,
    remaining_seats INT NOT NULL,
    warning_type VARCHAR(50) NOT NULL,
    log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flight_id) REFERENCES flights(id)
) ENGINE=InnoDB;


-- 6. SAMPLE DATA INSERTS

INSERT INTO airlines (name) VALUES 
('Air India'), ('IndiGo'), ('Vistara'), ('SpiceJet'), ('Lufthansa');

INSERT INTO airports (city, iata_code) VALUES 
('Delhi', 'DEL'), ('Mumbai', 'BOM'), ('Bangalore', 'BLR'), ('Chennai', 'MAA'), ('Hyderabad', 'HYD');

-- NEW USERS
INSERT INTO users (name, email, password, role) VALUES 
('Admin User', 'admin@site.com', 'admin123', 'admin'),
('Riya Sharma', 'riya@user.com', 'riya123', 'user'),
('Karan Singh', 'karan@user.com', 'karan123', 'user');


-- Flight Inserts (Using Subqueries and Dynamic Dates)

INSERT INTO flights (airline_id, flight_number, departure_airport_id, arrival_airport_id, departure_time, arrival_time, price, available_seats) VALUES
((SELECT airline_id FROM airlines WHERE name='Air India'), 'DL101', (SELECT airport_id FROM airports WHERE iata_code='DEL'), (SELECT airport_id FROM airports WHERE iata_code='BOM'), DATE_ADD(NOW(), INTERVAL 1 HOUR), DATE_ADD(NOW(), INTERVAL 3 HOUR), 5500.00, 100),
((SELECT airline_id FROM airlines WHERE name='IndiGo'), '6E305', (SELECT airport_id FROM airports WHERE iata_code='DEL'), (SELECT airport_id FROM airports WHERE iata_code='BOM'), DATE_ADD(NOW(), INTERVAL 5 HOUR), DATE_ADD(NOW(), INTERVAL 7 HOUR), 4800.00, 120),
((SELECT airline_id FROM airlines WHERE name='Lufthansa'), 'LH090', (SELECT airport_id FROM airports WHERE iata_code='DEL'), (SELECT airport_id FROM airports WHERE iata_code='BOM'), DATE_ADD(CURDATE(), INTERVAL '2 21:00:00' DAY_SECOND), DATE_ADD(CURDATE(), INTERVAL '2 23:00:00' DAY_SECOND), 7000.00, 4); -- 5 seats for testing trigger!

INSERT INTO flights (flight_number, airline_id, departure_airport_id, arrival_airport_id, departure_time, arrival_time, price, available_seats) VALUES
('LH080', (SELECT airline_id FROM airlines WHERE name = 'Lufthansa'), 
        (SELECT airport_id FROM airports WHERE city = 'Delhi'), (SELECT airport_id FROM airports WHERE city = 'Mumbai'), 
        CURDATE() + INTERVAL 2 DAY + INTERVAL 7 HOUR, CURDATE() + INTERVAL 2 DAY + INTERVAL 9 HOUR, 8000.00, 8); 

-- B. FULLY BOOKED (0 Seats Available) -> To show booking fail/locking logic
INSERT INTO flights (flight_number, airline_id, departure_airport_id, arrival_airport_id, departure_time, arrival_time, price, available_seats) VALUES
('SP777', (SELECT airline_id FROM airlines WHERE name = 'SpiceJet'), 
        (SELECT airport_id FROM airports WHERE city = 'Bangalore'), (SELECT airport_id FROM airports WHERE city = 'Chennai'), 
        CURDATE() + INTERVAL 3 DAY + INTERVAL 10 HOUR, CURDATE() + INTERVAL 3 DAY + INTERVAL 12 HOUR, 2500.00, 0);


-- C. LOW TO ZERO (1 Seat Available) -> To demonstrate SOLD OUT warning
INSERT INTO flights (flight_number, airline_id, departure_airport_id, arrival_airport_id, departure_time, arrival_time, price, available_seats) VALUES
('IN444', (SELECT airline_id FROM airlines WHERE name = 'IndiGo'), 
        (SELECT airport_id FROM airports WHERE city = 'Chennai'), (SELECT airport_id FROM airports WHERE city = 'Delhi'), 
        CURDATE() + INTERVAL 4 DAY + INTERVAL 14 HOUR, CURDATE() + INTERVAL 4 DAY + INTERVAL 16 HOUR, 4100.00, 1);

-- 7. TRIGGER IMPLEMENTATION (No Change)
DELIMITER //

CREATE TRIGGER after_seat_update
AFTER UPDATE ON flights
FOR EACH ROW
BEGIN
    IF NEW.available_seats < 10 AND OLD.available_seats >= 10 THEN
        INSERT INTO seat_warnings (flight_id, flight_number, remaining_seats, warning_type)
        VALUES (NEW.id, NEW.flight_number, NEW.available_seats, 'CRITICAL_LOW_SEATS');
    ELSEIF NEW.available_seats = 0 AND OLD.available_seats > 0 THEN
        INSERT INTO seat_warnings (flight_id, flight_number, remaining_seats, warning_type)
        VALUES (NEW.id, NEW.flight_number, NEW.available_seats, 'FLIGHT_SOLD_OUT');
    END IF;
END //

DELIMITER ;
DESCRIBE USERS;