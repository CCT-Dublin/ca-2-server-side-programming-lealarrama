import fs from "fs";
import csv from "csv-parser";
import { pool, ensureSchema } from "./database.js";

/* ===== Validation rules (ENUNCIADO) ===== */
const nameRe = /^[A-Za-zÀ-ÿ0-9]{1,20}$/;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^\d{10}$/;
const eircodeRe = /^[0-9][A-Za-z0-9]{5}$/;

/* ===== Validate one row ===== */
function validateRow(mapped) {
  const errors = [];

  const first_name = String(mapped.first_name || "").trim();
  const second_name = String(mapped.second_name || "").trim();
  const email = String(mapped.email || "").trim();
  const phone_number = String(mapped.phone_number || "").replace(/\D/g, "").trim();
  const eircode = String(mapped.eircode || "").trim();

  if (!nameRe.test(first_name)) errors.push("first_name");
  if (!nameRe.test(second_name)) errors.push("second_name");
  if (!emailRe.test(email)) errors.push("email");
  if (!phoneRe.test(phone_number)) errors.push("phone_number");
  if (!eircodeRe.test(eircode)) errors.push("eircode");

  return {
    ok: errors.length === 0,
    errors,
    clean: { first_name, second_name, email, phone_number, eircode },
  };
}

/* ===== Insert ===== */
async function insertRow(clean) {
  await pool.execute(
    `INSERT INTO mysql_table
     (first_name, second_name, email, phone_number, eircode)
     VALUES (?, ?, ?, ?, ?)`,
    [
      clean.first_name,
      clean.second_name,
      clean.email,
      clean.phone_number,
      clean.eircode,
    ]
  );
}

/* ===== Main ===== */
async function runImport() {
  await ensureSchema();

  const filePath = "./data/Personal_Information.csv";
  if (!fs.existsSync(filePath)) {
    console.error("CSV file not found:", filePath);
    process.exit(1);
  }

  let rowNumber = 1;
  let total = 0;
  let inserted = 0;
  let invalid = 0;

  // 🔥 CLAVE: limpiar BOM + normalizar headers
  const stream = fs.createReadStream(filePath).pipe(
    csv({
      mapHeaders: ({ header }) =>
        header
          .replace(/^\uFEFF/, "")   // <-- elimina BOM
          .trim()
          .toLowerCase(),
    })
  );

  for await (const row of stream) {
    rowNumber++;
    total++;

    // mapping CSV -> DB
    const mapped = {
      first_name: row.first_name,
      second_name: row.last_name,
      email: row.email,
      phone_number: row.phone,
      eircode: row.eir_code,
    };

    const result = validateRow(mapped);

    if (!result.ok) {
      invalid++;
      console.error(`Row ${rowNumber} invalid -> ${result.errors.join(", ")}`);
      continue;
    }

    try {
      await insertRow(result.clean);
      inserted++;
    } catch (err) {
      invalid++;
      console.error(`Row ${rowNumber} database error`);
    }
  }

  console.log("---- IMPORT SUMMARY ----");
  console.log("Total rows read:", total);
  console.log("Inserted:", inserted);
  console.log("Invalid/failed:", invalid);

  await pool.end();
}

runImport().catch((err) => {
  console.error("Import failed:", err.message);
  process.exit(1);
});