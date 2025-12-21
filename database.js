// Import MySQL library using promises
import mysql from "mysql2/promise";

// Load environment variables from .env file
import "dotenv/config";

// Create a connection pool to the MySQL database
export const pool = mysql.createPool({
  // Database host (for example: localhost)
  host: process.env.DB_HOST,

  // Database user
  user: process.env.DB_USER,

  // Database password
  password: process.env.DB_PASSWORD,

  // Database name
  database: process.env.DB_NAME,

  // Database port (default MySQL port is 3306)
  port: Number(process.env.DB_PORT || 3306),

  // Allow multiple connections to wait
  waitForConnections: true,

  // Maximum number of connections in the pool
  connectionLimit: 10,

  // Unlimited queue for waiting connections
  queueLimit: 0,
});

// Function to make sure the database table exists
export async function ensureSchema() {
  // SQL query to create the table if it does not exist
  const sql = `
    CREATE TABLE IF NOT EXISTS mysql_table (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(20) NOT NULL,
      second_name VARCHAR(20) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone_number VARCHAR(10) NOT NULL,
      eircode VARCHAR(6) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Execute the SQL query
  await pool.query(sql);
}

// Function to test if the database connection is working
export async function testDbConnection() {
  // Simple query to test the connection
  const [rows] = await pool.query("SELECT 1 AS ok;");

  // Return true if the query was successful
  return rows[0]?.ok === 1;
}