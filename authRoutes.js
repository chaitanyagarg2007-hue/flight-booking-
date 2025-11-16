import express from "express";
import db from "../db.js"; 

const router = express.Router();

// --- Register User (Final Fix) ---
router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;
    // ... (Validation code) ...

    try {
        const [existingUser] = await db.query("SELECT email FROM users WHERE email = ?", [email]);
        if (existingUser.length > 0) {
            return res.status(409).json({ message: "Email already registered. Try logging in." });
        }

        await db.query(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name, email, password]
        );

        res.json({ message: "Registration successful! Please log in." });

    } catch (error) {
        console.error("Server error during registration:", error);
        res.status(500).json({ message: "Error: Server error during registration." });
    }
});

// --- Login User (Final Fix) ---
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    // ... (Validation code) ...

    try {
        // FIX: Removed 'role' from the SELECT query to match the simplified table
        const [users] = await db.query("SELECT user_id, name, password FROM users WHERE email = ?", [email]);

        if (users.length === 0) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const user = users[0];
        
        if (user.password !== password) {
             return res.status(401).json({ message: "Invalid email or password." });
        }
        
        // Successful Login - Return User details
        res.json({
            message: `Login successful. Welcome ${user.name}!`,
            user: {
                userId: user.user_id,
                name: user.name,
                email: email,
                role: 'user' // Default to 'user' role on client side
            }
        });

    } catch (error) {
        console.error("Server error during login:", error);
        res.status(500).json({ message: "Error: Server error during login." });
    }
});

export default router;