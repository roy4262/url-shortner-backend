const { Pool } = require("pg");
const fs = require("fs");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const sql = fs.readFileSync("./init.sql", "utf-8");
    await pool.query(sql);
    console.log("✓ Database initialized successfully");
  } catch (err) {
    console.error("✗ Error:", err.message);
  } finally {
    await pool.end();
  }
})();
