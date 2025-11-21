const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    console.log("Testing database connection...");
    const result = await pool.query("SELECT 1");
    console.log("✓ DB connection OK");
    
    const tables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log("✓ Tables:", tables.rows.map((r) => r.table_name));
    
    const links = await pool.query("SELECT COUNT(*) FROM links");
    console.log("✓ Links count:", links.rows[0].count);
  } catch (err) {
    console.error("✗ Error:", err.message);
  } finally {
    await pool.end();
  }
})();
