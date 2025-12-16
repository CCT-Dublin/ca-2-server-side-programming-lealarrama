import express from "express";
import "dotenv/config";
import { ensureSchema, testDbConnection } from "./database.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Middleware básico (suficiente para empezar)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(".")); // para servir form.html si querés abrirlo

app.get("/health", async (req, res) => {
  try {
    const ok = await testDbConnection();
    res.json({ server: "ok", db: ok ? "ok" : "fail" });
  } catch (err) {
    res.status(500).json({ server: "ok", db: "fail", error: err.message });
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