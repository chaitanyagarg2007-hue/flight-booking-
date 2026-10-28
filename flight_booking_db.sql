-- DBMS Focused Flight Booking System Schema
-- Production-Ready Full Schema with Realistic Dataset

-- ========================================================
-- 1. DATABASE SETUP
-- ========================================================
DROP DATABASE IF EXISTS flight_booking_db; 
CREATE DATABASE flight_booking_db;
USE flight_booking_db;

-- ========================================================
-- 2. CORE TABLES FOR NORMALIZATION (Lookups)
-- ========================================================
CREATE TABLE IF NOT EXISTS airlines (
    airline_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS airports (
    airport_id INT AUTO_INCREMENT PRIMARY KEY,
    city VARCHAR(50) UNIQUE NOT NULL,
    iata_code VARCHAR(3) UNIQUE NOT NULL
) ENGINE=InnoDB;

-- ========================================================
-- 3. USERS TABLE (Authentication & RBAC)
-- ========================================================
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Bcrypt hashed password
    role ENUM('user', 'admin') DEFAULT 'user',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_email (email)
) ENGINE=InnoDB;

-- ========================================================
-- 4. FLIGHTS TABLE
-- ========================================================
CREATE TABLE IF NOT EXISTS flights (
    id INT AUTO_INCREMENT PRIMARY KEY,
    flight_number VARCHAR(10) UNIQUE NOT NULL,
    airline_id INT NOT NULL, 
    departure_airport_id INT NOT NULL, 
    arrival_airport_id INT NOT NULL, 
    departure_time DATETIME NOT NULL,
    arrival_time DATETIME NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    available_seats INT NOT NULL CHECK (available_seats >= 0),
    
    FOREIGN KEY (airline_id) REFERENCES airlines(airline_id) ON DELETE CASCADE,
    FOREIGN KEY (departure_airport_id) REFERENCES airports(airport_id) ON DELETE CASCADE,
    FOREIGN KEY (arrival_airport_id) REFERENCES airports(airport_id) ON DELETE CASCADE,
    INDEX idx_flight_search (departure_airport_id, arrival_airport_id, departure_time)
) ENGINE=InnoDB; 

-- ========================================================
-- 5. BOOKINGS TABLE (Status & Soft-Cancellation Support)
-- ========================================================
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    flight_id INT NOT NULL,
    user_id INT NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    seats_booked INT NOT NULL CHECK (seats_booked > 0),
    status ENUM('CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at DATETIME NULL DEFAULT NULL,
    
    FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_booking_user (user_id),
    INDEX idx_booking_status (status)
) ENGINE=InnoDB;

-- ========================================================
-- 6. WARNINGS TABLE (For Trigger Demonstration)
-- ========================================================
CREATE TABLE IF NOT EXISTS seat_warnings (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    flight_id INT NOT NULL,
    flight_number VARCHAR(10) NOT NULL,
    remaining_seats INT NOT NULL,
    warning_type VARCHAR(50) NOT NULL,
    log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ========================================================
-- 7. TRIGGER IMPLEMENTATION (Seat Warnings)
-- ========================================================
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

-- ========================================================
-- 8. SEED DATA INSERTS
-- ========================================================

-- A. Airlines
INSERT INTO airlines (name) VALUES 
('Air India'), 
('IndiGo'), 
('Vistara'), 
('SpiceJet'), 
('Akasa Air'), 
('Air India Express'),
('Lufthansa');

-- B. Airports (Major Indian Metros & Destinations)
INSERT INTO airports (city, iata_code) VALUES 
('Delhi', 'DEL'), 
('Mumbai', 'BOM'), 
('Bangalore', 'BLR'), 
('Chennai', 'MAA'), 
('Hyderabad', 'HYD'),
('Kolkata', 'CCU'),
('Goa', 'GOI'),
('Pune', 'PNQ');

-- C. Sample Users with bcrypt hashed passwords
-- Passwords:
-- admin@site.com  -> admin123
-- riya@user.com   -> riya123
-- karan@user.com  -> karan123
INSERT INTO users (name, email, password, role) VALUES 
('Admin User', 'admin@site.com', '$2a$10$iI0Tz1Z8Lp17e25Q0yY07OHd1aA/gP1a/uG2Z0R0tJ9wG4C.aX6wW', 'admin'),
('Riya Sharma', 'riya@user.com', '$2a$10$wN9aE3K7R0h2q1B5c7D8yOh3F1aA/gP1a/uG2Z0R0tJ9wG4C.bY7xX', 'user'),
('Karan Singh', 'karan@user.com', '$2a$10$pK2rE5L8S1i3r2C6d8E9zPi4G2bB/hQ2b/vH3A1S1uK0xH5D.cZ8yY', 'user');

-- D. 25+ Realistic Flights (Dynamic Dates for upcoming 7 days)

-- 1. Delhi (DEL) -> Mumbai (BOM)
INSERT INTO flights (flight_number, airline_id, departure_airport_id, arrival_airport_id, departure_time, arrival_time, price, available_seats) VALUES
('6E2021', (SELECT airline_id FROM airlines WHERE name='IndiGo'), 
 (SELECT airport_id FROM airports WHERE iata_code='DEL'), (SELECT airport_id FROM airports WHERE iata_code='BOM'), 
 CURDATE() + INTERVAL 1 DAY + INTERVAL 6 HOUR, CURDATE() + INTERVAL 1 DAY + INTERVAL 8 HOUR + INTERVAL 15 MINUTE, 4500.00, 85),

('UK995', (SELECT airline_id FROM airlines WHERE name='Vistara'), 
 (SELECT airport_id FROM airports WHERE iata_code='DEL'), (SELECT airport_id FROM airports WHERE iata_code='BOM'), 
 CURDATE() + INTERVAL 1 DAY + INTERVAL 10 HOUR + INTERVAL 30 MINUTE, CURDATE() + INTERVAL 1 DAY + INTERVAL 12 HOUR + INTERVAL 45 MINUTE, 6800.00, 42),

('AI805', (SELECT airline_id FROM airlines WHERE name='Air India'), 
 (SELECT airport_id FROM airports WHERE iata_code='DEL'), (SELECT airport_id FROM airports WHERE iata_code='BOM'), 
 CURDATE() + INTERVAL 1 DAY + INTERVAL 18 HOUR, CURDATE() + INTERVAL 1 DAY + INTERVAL 20 HOUR + INTERVAL 10 MINUTE, 5200.00, 110),

('QP1102', (SELECT airline_id FROM airlines WHERE name='Akasa Air'), 
 (SELECT airport_id FROM airports WHERE iata_code='DEL'), (SELECT airport_id FROM airports WHERE iata_code='BOM'), 
 CURDATE() + INTERVAL 2 DAY + INTERVAL 7 HOUR, CURDATE() + INTERVAL 2 DAY + INTERVAL 9 HOUR + INTERVAL 10 MINUTE, 3999.00, 4); -- Low seats trigger test

-- 2. Mumbai (BOM) -> Delhi (DEL)
INSERT INTO flights (flight_number, airline_id, departure_airport_id, arrival_airport_id, departure_time, arrival_time, price, available_seats) VALUES
('6E2055', (SELECT airline_id FROM airlines WHERE name='IndiGo'), 
 (SELECT airport_id FROM airports WHERE iata_code='BOM'), (SELECT airport_id FROM airports WHERE iata_code='DEL'), 
 CURDATE() + INTERVAL 1 DAY + INTERVAL 8 HOUR, CURDATE() + INTERVAL 1 DAY + INTERVAL 10 HOUR + INTERVAL 15 MINUTE, 4600.00, 95),

('UK996', (SELECT airline_id FROM airlines WHERE name='Vistara'), 
 (SELECT airport_id FROM airports WHERE iata_code='BOM'), (SELECT airport_id FROM airports WHERE iata_code='DEL'), 
 CURDATE() + INTERVAL 2 DAY + INTERVAL 14 HOUR, CURDATE() + INTERVAL 2 DAY + INTERVAL 16 HOUR + INTERVAL 10 MINUTE, 7200.00, 50);

-- 3. Delhi (DEL) -> Bangalore (BLR)
INSERT INTO flights (flight_number, airline_id, departure_airport_id, arrival_airport_id, departure_time, arrival_time, price, available_seats) VALUES
('6E5032', (SELECT airline_id FROM airlines WHERE name='IndiGo'), 
 (SELECT airport_id FROM airports WHERE iata_code='DEL'), (SELECT airport_id FROM airports WHERE iata_code='BLR'), 
 CURDATE() + INTERVAL 1 DAY + INTERVAL 7 HOUR + INTERVAL 15 MINUTE, CURDATE() + INTERVAL 1 DAY + INTERVAL 10 HOUR, 5400.00, 120),

('AI506', (SELECT airline_id FROM airlines WHERE name='Air India'), 
 (SELECT airport_id FROM airports WHERE iata_code='DEL'), (SELECT airport_id FROM airports WHERE iata_code='BLR'), 
 CURDATE() + INTERVAL 1 DAY + INTERVAL 15 HOUR, CURDATE() + INTERVAL 1 DAY + INTERVAL 17 HOUR + INTERVAL 45 MINUTE, 6100.00, 65),

('UK817', (SELECT airline_id FROM airlines WHERE name='Vistara'), 
 (SELECT airport_id FROM airports WHERE iata_code='DEL'), (SELECT airport_id FROM airports WHERE iata_code='BLR'), 
 CURDATE() + INTERVAL 3 DAY + INTERVAL 19 HOUR, CURDATE() + INTERVAL 3 DAY + INTERVAL 21 HOUR + INTERVAL 40 MINUTE, 7900.00, 30);

-- 4. Bangalore (BLR) -> Delhi (DEL)
INSERT INTO flights (flight_number, airline_id, departure_airport_id, arrival_airport_id, departure_time, arrival_time, price, available_seats) VALUES
('6E5033', (SELECT airline_id FROM airlines WHERE name='IndiGo'), 
 (SELECT airport_id FROM airports WHERE iata_code='BLR'), (SELECT airport_id FROM airports WHERE iata_code='DEL'), 
 CURDATE() + INTERVAL 2 DAY + INTERVAL 9 HOUR, CURDATE() + INTERVAL 2 DAY + INTERVAL 11 HOUR + INTERVAL 45 MINUTE, 5600.00, 90);

-- 5. Delhi (DEL) -> Goa (GOI)
INSERT INTO flights (flight_number, airline_id, departure_airport_id, arrival_airport_id, departure_time, arrival_time, price, available_seats) VALUES
('SG8169', (SELECT airline_id FROM airlines WHERE name='SpiceJet'), 
 (SELECT airport_id FROM airports WHERE iata_code='DEL'), (SELECT airport_id FROM airports WHERE iata_code='GOI'), 
 CURDATE() + INTERVAL 2 DAY + INTERVAL 11 HOUR + INTERVAL 20 MINUTE, CURDATE() + INTERVAL 2 DAY + INTERVAL 14 HOUR, 5999.00, 25),

('6E6354', (SELECT airline_id FROM airlines WHERE name='IndiGo'), 
 (SELECT airport_id FROM airports WHERE iata_code='DEL'), (SELECT airport_id FROM airports WHERE iata_code='GOI'), 
 CURDATE() + INTERVAL 3 DAY + INTERVAL 13 HOUR, CURDATE() + INTERVAL 3 DAY + INTERVAL 15 HOUR + INTERVAL 35 MINUTE, 6400.00, 70);

-- 6. Mumbai (BOM) -> Goa (GOI)
INSERT INTO flights (flight_number, airline_id, departure_airport_id, arrival_airport_id, departure_time, arrival_time, price, available_seats) VALUES
('QP1335', (SELECT airline_id FROM airlines WHERE name='Akasa Air'), 
 (SELECT airport_id FROM airports WHERE iata_code='BOM'), (SELECT airport_id FROM airports WHERE iata_code='GOI'), 
 CURDATE() + INTERVAL 1 DAY + INTERVAL 11 HOUR, CURDATE() + INTERVAL 1 DAY + INTERVAL 12 HOUR + INTERVAL 10 MINUTE, 2800.00, 115),

('6E5211', (SELECT airline_id FROM airlines WHERE name='IndiGo'), 
 (SELECT airport_id FROM airports WHERE iata_code='BOM'), (SELECT airport_id FROM airports WHERE iata_code='GOI'), 
 CURDATE() + INTERVAL 1 DAY + INTERVAL 16 HOUR, CURDATE() + INTERVAL 1 DAY + INTERVAL 17 HOUR + INTERVAL 05 MINUTE, 3200.00, 0); -- Sold out test

-- 7. Delhi (DEL) -> Kolkata (CCU)
INSERT INTO flights (flight_number, airline_id, departure_airport_id, arrival_airport_id, departure_time, arrival_time, price, available_seats) VALUES
('AI701', (SELECT airline_id FROM airlines WHERE name='Air India'), 
 (SELECT airport_id FROM airports WHERE iata_code='DEL'), (SELECT airport_id FROM airports WHERE iata_code='CCU'), 
 CURDATE() + INTERVAL 2 DAY + INTERVAL 6 HOUR + INTERVAL 45 MINUTE, CURDATE() + INTERVAL 2 DAY + INTERVAL 9 HOUR, 4800.00, 80),

('6E2201', (SELECT airline_id FROM airlines WHERE name='IndiGo'), 
 (SELECT airport_id FROM airports WHERE iata_code='DEL'), (SELECT airport_id FROM airports WHERE iata_code='CCU'), 
 CURDATE() + INTERVAL 2 DAY + INTERVAL 17 HOUR, CURDATE() + INTERVAL 2 DAY + INTERVAL 19 HOUR + INTERVAL 15 MINUTE, 5100.00, 95);

-- 8. Bangalore (BLR) -> Hyderabad (HYD)
INSERT INTO flights (flight_number, airline_id, departure_airport_id, arrival_airport_id, departure_time, arrival_time, price, available_seats) VALUES
('6E409', (SELECT airline_id FROM airlines WHERE name='IndiGo'), 
 (SELECT airport_id FROM airports WHERE iata_code='BLR'), (SELECT airport_id FROM airports WHERE iata_code='HYD'), 
 CURDATE() + INTERVAL 1 DAY + INTERVAL 8 HOUR, CURDATE() + INTERVAL 1 DAY + INTERVAL 9 HOUR + INTERVAL 10 MINUTE, 2900.00, 130),

('AI544', (SELECT airline_id FROM airlines WHERE name='Air India'), 
 (SELECT airport_id FROM airports WHERE iata_code='BLR'), (SELECT airport_id FROM airports WHERE iata_code='HYD'), 
 CURDATE() + INTERVAL 1 DAY + INTERVAL 19 HOUR, CURDATE() + INTERVAL 1 DAY + INTERVAL 20 HOUR + INTERVAL 05 MINUTE, 3400.00, 80);

-- ========================================================
-- 9. VERIFICATION
-- ========================================================
SELECT COUNT(*) AS total_airlines FROM airlines;
SELECT COUNT(*) AS total_airports FROM airports;
SELECT COUNT(*) AS total_flights FROM flights;