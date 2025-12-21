// Import Express framework
import express from "express";

// Load environment variables from .env file
import "dotenv/config";

// Import database functions and pool connection
import { ensureSchema, testDbConnection, pool } from "./database.js";

// Create the Express app
const app = express();

// Read the port from .env, or use 3000 as default
const PORT = Number(process.env.PORT || 3000);

/* Middleware (C) */

// Middleware to read JSON request bodies
app.use(express.json());

// Middleware to read form data (urlencoded)
app.use(express.urlencoded({ extended: true }));

// Middleware to serve static files from the "public" folder
app.use(express.static("public"));

/* Health check (evidence) */

// Route to check if server and database are working
app.get("/health", async (req, res) => {
  try {
    // Test database connection
    const ok = await testDbConnection();

    // Return status in JSON format
    res.json({ server: "ok", db: ok ? "ok" : "fail" });
  } catch (err) {
    // If something fails, return an error response
    res.status(500).json({ server: "ok", db: "fail", error: err.message });
  }
});

/* Validation rules (server-side) */

// Regex for first name and second name (letters/numbers, max 20)
const nameRe = /^[A-Za-zÀ-ÿ0-9]{1,20}$/;

// Regex for email format
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Regex for phone number (exactly 10 digits)
const phoneRe = /^\d{10}$/;

// Regex for eircode (start with number + 5 alphanumeric = 6 total)
const eircodeRe = /^[0-9][A-Za-z0-9]{5}$/;

// Function to validate one request body (one form submission)
function validateRow(data) {
  // Array to store validation errors
  const errors = [];

  // Read and clean values from the request body
  const first_name = String(data.first_name ?? "").trim();
  const second_name = String(data.second_name ?? "").trim();
  const email = String(data.email ?? "").trim();

  // Remove non-numeric characters from phone number
  const phone_number = String(data.phone_number ?? "")
    .replace(/\D/g, "")
    .trim();

  // Remove spaces from eircode
  const eircode = String(data.eircode ?? "")
    .replace(/\s+/g, "")
    .trim();

  // Validate each field using regex rules
  if (!nameRe.test(first_name)) errors.push("first_name invalid");
  if (!nameRe.test(second_name)) errors.push("second_name invalid");
  if (!emailRe.test(email)) errors.push("email invalid");
  if (!phoneRe.test(phone_number)) errors.push("phone_number invalid");
  if (!eircodeRe.test(eircode)) errors.push("eircode invalid");

  // Return result and cleaned data
  return {
    ok: errors.length === 0,
    errors,
    clean: { first_name, second_name, email, phone_number, eircode },
  };
}

// Route to receive data from the HTML form (POST request)
app.post("/api/submit", async (req, res) => {
  try {
    // Ensure the database table exists before saving (C requirement)
    await ensureSchema();

    // Validate the received data
    const result = validateRow(req.body);

    // If validation fails, return 400 error with details
    if (!result.ok) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: result.errors });
    }

    // Insert data into database using parameterized query (secure)
    const [dbResult] = await pool.execute(
      `INSERT INTO mysql_table (first_name, second_name, email, phone_number, eircode)
       VALUES (?, ?, ?, ?, ?)`,
      [
        result.clean.first_name,
        result.clean.second_name,
        result.clean.email,
        result.clean.phone_number,
        result.clean.eircode,
      ]
    );

    // Return success response and inserted ID
    res.json({ message: "Inserted", insertId: dbResult.insertId });
  } catch (err) {
    // Return server error response
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// Function to start the server
async function start() {
  try {
    // Ensure schema exists at server startup (C requirement)
    await ensureSchema();

    // Start server listening on the chosen port
    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    // Handle server errors (example: port already in use)
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`ERROR: Port ${PORT} is already in use.`);
      } else {
        console.error("Server error:", err.message);
      }
      process.exit(1);
    });
  } catch (err) {
    // If server cannot start, show error and exit
    console.error("ERROR: Could not start server:", err.message);
    process.exit(1);
  }
}

// Start the server
start();