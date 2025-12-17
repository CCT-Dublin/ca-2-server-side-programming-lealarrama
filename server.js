import express from "express";
import "dotenv/config";
import { ensureSchema, testDbConnection, pool } from "./database.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);

/* Middleware (C) */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

/* Health check (evidencia) */
app.get("/health", async (req, res) => {
  try {
    const ok = await testDbConnection();
    res.json({ server: "ok", db: ok ? "ok" : "fail" });
  } catch (err) {
    res.status(500).json({ server: "ok", db: "fail", error: err.message });
  }
});

/* Validation rules (server-side) */
const nameRe = /^[A-Za-zÀ-ÿ0-9]{1,20}$/;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^\d{10}$/;
const eircodeRe = /^[0-9][A-Za-z0-9]{5}$/;

function validateRow(data) {
  const errors = [];

  const first_name = String(data.first_name ?? "").trim();
  const second_name = String(data.second_name ?? "").trim();
  const email = String(data.email ?? "").trim();
  const phone_number = String(data.phone_number ?? "").replace(/\D/g, "").trim();
  const eircode = String(data.eircode ?? "").replace(/\s+/g, "").trim();

  if (!nameRe.test(first_name)) errors.push("first_name invalid");
  if (!nameRe.test(second_name)) errors.push("second_name invalid");
  if (!emailRe.test(email)) errors.push("email invalid");
  if (!phoneRe.test(phone_number)) errors.push("phone_number invalid");
  if (!eircodeRe.test(eircode)) errors.push("eircode invalid");

  return { ok: errors.length === 0, errors, clean: { first_name, second_name, email, phone_number, eircode } };
}

app.post("/api/submit", async (req, res) => {
  try {
    await ensureSchema(); // (C) schema check before saving

    const result = validateRow(req.body);
    if (!result.ok) {
      return res.status(400).json({ error: "Validation failed", details: result.errors });
    }

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

    res.json({ message: "Inserted", insertId: dbResult.insertId });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

async function start() {
  try {
    await ensureSchema(); // (C) schema check at startup

    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`ERROR: Port ${PORT} is already in use.`);
      } else {
        console.error("Server error:", err.message);
      }
      process.exit(1);
    });
  } catch (err) {
    console.error("ERROR: Could not start server:", err.message);
    process.exit(1);
  }
}

start();