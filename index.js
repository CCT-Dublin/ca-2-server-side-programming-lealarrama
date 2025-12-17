import fs from "fs";
import { Readable } from "stream";
import csv from "csv-parser";
import { pool, ensureSchema } from "./database.js";

const nameRe = /^[A-Za-zÀ-ÿ0-9]{1,20}$/;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^\d{10}$/;
const eircodeRe = /^[0-9][A-Za-z0-9]{5}$/;

function validateRow(row) {
  const errors = [];

  const first_name = String(row.first_name || "").trim();
  const second_name = String(row.last_name || "").trim();
  const email = String(row.email || "").trim();
  const phone_number = String(row.phone || "").replace(/\D/g, "").trim();
  const eircode = String(row.eir_code || "").replace(/\s+/g, "").trim();

  if (!nameRe.test(first_name)) errors.push("first_name");
  if (!nameRe.test(second_name)) errors.push("second_name");
  if (!emailRe.test(email)) errors.push("email");
  if (!phoneRe.test(phone_number)) errors.push("phone_number");
  if (!eircodeRe.test(eircode)) errors.push("eircode");

  return { ok: errors.length === 0, errors, clean: { first_name, second_name, email, phone_number, eircode } };
}

async function insertRow(clean) {
  await pool.execute(
    `INSERT INTO mysql_table (first_name, second_name, email, phone_number, eircode)
     VALUES (?, ?, ?, ?, ?)`,
    [clean.first_name, clean.second_name, clean.email, clean.phone_number, clean.eircode]
  );
}

async function runImport() {
  await ensureSchema();

  const filePath = "./data/Personal_Information.csv";
  if (!fs.existsSync(filePath)) {
    console.error("CSV file not found:", filePath);
    process.exit(1);
  }

  let text = fs.readFileSync(filePath, "utf8");
  text = text.replace(/^\uFEFF/, ""); // remove BOM

  let rowNumber = 1;
  let total = 0;
  let inserted = 0;
  let invalid = 0;

  const stream = Readable.from([text]).pipe(csv());

  for await (const row of stream) {
    rowNumber++;
    total++;

    const result = validateRow(row);

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
      console.error(`Row ${rowNumber} database error -> ${err.message}`);
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