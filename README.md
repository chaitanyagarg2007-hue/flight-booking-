# flight-booking-
A simple backend project for managing users, flights, and bookings using Node.js, Express, and MySQL.
Includes foreign keys, triggers, constraints, and clean relational design.

⭐ Features

User Registration & Login

Flight Management (Add, View, Update Seats)

Booking System with seat validation

Auto Seat-Warning Logs using MySQL Trigger

Relational Database with proper constraints

🗄️ Database Overview

Tables:
users, airlines, airports, flights, bookings, seat_warnings

Key Highlights:

Primary Keys ensure unique identification

Foreign Keys enforce valid relationships

Unique + NOT NULL constraints maintain clean data

CHECK constraint: available_seats >= 0

Trigger logs when seats <10 or become 0

🧩 Tech Stack

Node.js

Express.js

MySQL (InnoDB)

⚙️ Setup

Clone repo

git clone <repo-url>
cd flight-booking-system


Install dependencies

npm install


Edit db.js

host: 127.0.0.1
user: root
password: 1234
database: flight_booking_db
port: 3306


Import SQL

mysql -u root -p < flight_booking_db.sql


Run server

npm start

📡 API Endpoints

Users

POST /users/register

POST /users/login

Flights

POST /flights/add

GET /flights/all

PUT /flights/update/:id

Bookings

POST /bookings/create
