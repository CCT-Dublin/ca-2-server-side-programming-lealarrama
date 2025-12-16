import express from "express";
import "dotenv/config";
import { ensureSchema, testDbConnection, pool } from "./database.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Middleware básico (suficiente para empezar)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));


app.get("/health", async (req, res) => {
  try {
    const ok = await testDbConnection();
    res.json({ server: "ok", db: ok ? "ok" : "fail" });
  } catch (err) {
    res.status(500).json({ server: "ok", db: "fail", error: err.message });
  }
});

const nameRe = /^[A-Za-zÀ-ÿ0-9]{1,20}$/;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^\d{10}$/;
const eircodeRe = /^[0-9][A-Za-z0-9]{5}$/;

function validateRow(data) {
  const errors = [];

  const first = String(data.first_name ?? "").trim();
  const second = String(data.second_name ?? "").trim();
  const email = String(data.email ?? "").trim();
  const phone = String(data.phone_number ?? "").trim();
    if (!phoneRe.test(phone)) errors.push("phone invalid (exactly 10 digits)");
  const eircode = String(data.eircode ?? "").trim();

  if (!nameRe.test(first)) errors.push("first_name invalid");
  if (!nameRe.test(second)) errors.push("second_name invalid");
  if (!emailRe.test(email)) errors.push("email invalid");
  if (!phoneRe.test(phone)) errors.push("phone_number invalid");
  if (!eircodeRe.test(eircode)) errors.push("eircode invalid");

  return { ok: errors.length === 0, errors, clean: { first, second, email, phone, eircode } };
}

app.post("/api/submit", async (req, res) => {
  try {
    // C) aseguramos schema antes de guardar (extra safety)
    await ensureSchema();

    const { ok, errors, clean } = validateRow(req.body);
    if (!ok) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const [result] = await pool.execute(
      `INSERT INTO mysql_table (first_name, second_name, email, phone_number, eircode)
       VALUES (?, ?, ?, ?, ?)`,
      [clean.first, clean.second, clean.email, clean.phone, clean.eircode]
    );

    res.json({ message: "Inserted", insertId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});





// Arranque del server + chequeos (C)
async function start() {
  try {
    await ensureSchema(); // asegura mysql_table antes de guardar datos
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("ERROR: Could not start server:", err.message);
    process.exit(1);
  }
}

start();

// Manejo de error de puerto ocupado (C)
process.on("uncaughtException", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`ERROR: Port ${PORT} is already in use.`);
  } else {
    console.error("Uncaught exception:", err);
  }
  process.exit(1);
});