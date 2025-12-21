// Import file system module to read files
import fs from "fs";

// Import Readable stream to process text as a stream
import { Readable } from "stream";

// Import csv-parser library to read CSV files
import csv from "csv-parser";

// Import database connection pool and schema check
import { pool, ensureSchema } from "./database.js";

// Regular expression for first name and second name
// Only letters or numbers, maximum 20 characters
const nameRe = /^[A-Za-zÀ-ÿ0-9]{1,20}$/;

// Regular expression for email validation
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Regular expression for phone number (exactly 10 digits)
const phoneRe = /^\d{10}$/;

// Regular expression for eircode validation
// Must start with a number and be 6 alphanumeric characters
const eircodeRe = /^[0-9][A-Za-z0-9]{5}$/;

// Function to validate one row from the CSV file
function validateRow(row) {
  // Array to store validation errors
  const errors = [];

  // Read and clean values from CSV row
  const first_name = String(row.first_name || "").trim();
  const second_name = String(row.last_name || "").trim();
  const email = String(row.email || "").trim();

  // Remove non-numeric characters from phone number
  const phone_number = String(row.phone || "")
    .replace(/\D/g, "")
    .trim();

  // Remove spaces from eircode
  const eircode = String(row.eir_code || "")
    .replace(/\s+/g, "")
    .trim();

  // Validate each field using regex rules
  if (!nameRe.test(first_name)) errors.push("first_name");
  if (!nameRe.test(second_name)) errors.push("second_name");
  if (!emailRe.test(email)) errors.push("email");
  if (!phoneRe.test(phone_number)) errors.push("phone_number");
  if (!eircodeRe.test(eircode)) errors.push("eircode");

  // Return validation result and clean data
  return {
    ok: errors.length === 0,
    errors,
    clean: { first_name, second_name, email, phone_number, eircode },
  };
}

// Function to insert a valid row into the database
async function insertRow(clean) {
  // Use parameterized SQL query to avoid SQL injection
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

// Main function to run the CSV import
async function runImport() {
  // Ensure that the database table exists
  await ensureSchema();

  // Path to the CSV file
  const filePath = "./data/Personal_Information.csv";

  // Check if CSV file exists
  if (!fs.existsSync(filePath)) {
    console.error("CSV file not found:", filePath);
    process.exit(1);
  }

  // Read the CSV file as text
  let text = fs.readFileSync(filePath, "utf8");

  // Remove BOM (Byte Order Mark) if present
  text = text.replace(/^\uFEFF/, "");

  // Counters for summary
  let rowNumber = 1;
  let total = 0;
  let inserted = 0;
  let invalid = 0;

  // Convert text into a readable stream and parse CSV
  const stream = Readable.from([text]).pipe(csv());

  // Process each row asynchronously
  for await (const row of stream) {
    rowNumber++;
    total++;

    // Validate the current row
    const result = validateRow(row);

    // If row is invalid, log error and continue
    if (!result.ok) {
      invalid++;
      console.error(
        `Row ${rowNumber} invalid -> ${result.errors.join(", ")}`
      );
      continue;
    }

    try {
      // Insert valid row into the database
      await insertRow(result.clean);
      inserted++;
    } catch (err) {
      // Handle database insertion error
      invalid++;
      console.error(
        `Row ${rowNumber} database error -> ${err.message}`
      );
    }
  }

  // Show import summary
  console.log("---- IMPORT SUMMARY ----");
  console.log("Total rows read:", total);
  console.log("Inserted:", inserted);
  console.log("Invalid/failed:", invalid);

  // Close database connection pool
  await pool.end();
}

// Run the import process and handle unexpected errors
runImport().catch((err) => {
  console.error("Import failed:", err.message);
  process.exit(1);
});