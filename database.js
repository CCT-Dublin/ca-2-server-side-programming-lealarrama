import mysql from "mysql2/promise";
import "dotenv/config";

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// C) Antes de guardar datos, asegurar que el schema existe
export async function ensureSchema() {
  const sql = `
    CREATE TABLE IF NOT EXISTS mysql_table (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(20) NOT NULL,
      second_name VARCHAR(20) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(10) NOT NULL,
      eircode VARCHAR(6) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(sql);
}

// Test rápido de conexión (para debug)
export async function testDbConnection() {
  const [rows] = await pool.query("SELECT 1 AS ok;");
  return rows[0]?.ok === 1;
}