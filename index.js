const express = require("express");

const crypto = require("crypto");
const db = require("./db");
require("dotenv").config();

const app = express();

// Simple request logger to help debug CORS and other issues
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} -> ${req.method} ${req.originalUrl}`
  );
  next();
});

// Configure CORS explicitly. By default allow all origins, but you can
// restrict via environment variable CORS_ORIGIN (e.g. http://localhost:5173)
const cors = require("cors");
const corsOptions = {
  origin: process.env.CORS_ORIGIN || true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  // Do not hardcode allowedHeaders so the library will echo the request's
  // Access-Control-Request-Headers; hardcoding some headers can cause
  // preflight failures when the browser sends additional client-hint headers.
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Log preflight details to help debug CORS issues (run before body parsing)
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    console.log(
      "CORS preflight headers:",
      req.headers["access-control-request-headers"]
    );
    console.log("Origin header:", req.headers.origin);
  }
  next();
});

app.use(express.json());

// Helper: generate short code
function generateCode(len = 6) {
  return crypto
    .randomBytes(Math.ceil(len / 2))
    .toString("hex")
    .slice(0, len);
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (err) {
    return false;
  }
}

// Health check
async function checkDb() {
  try {
    // simple lightweight check
    await db.query("SELECT 1");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
}

app.get("/healthz", async (req, res) => {
  const dbStatus = await checkDb();
  if (!dbStatus.ok) {
    return res.status(500).json({ ok: false, version: "1.0", db: dbStatus });
  }
  res.json({ ok: true, version: "1.0", db: dbStatus });
});

// Create link
app.post("/api/links", async (req, res) => {
  console.log("POST /api/links body:", req.body);
  const { url, code } = req.body || {};
  if (!url || typeof url !== "string" || !isValidUrl(url)) {
    return res.status(400).json({ error: "invalid url" });
  }

  const desired = code && String(code).trim();
  let finalCode = desired || generateCode(6);

  try {
    if (desired) {
      // Check exists
      const existing = await db.query(
        "SELECT code FROM links WHERE code = $1",
        [finalCode]
      );
      if (existing.rowCount > 0) {
        return res.status(409).json({ error: "code already exists" });
      }
    }

    await db.query("INSERT INTO links(code, url) VALUES($1, $2)", [
      finalCode,
      url,
    ]);

    return res.status(201).json({ code: finalCode, url });
  } catch (err) {
    console.error("POST /api/links error", err && err.stack ? err.stack : err);
    // Handle unique violation if race created code
    if (err.code === "23505") {
      return res.status(409).json({ error: "code already exists" });
    }
    return res.status(500).json({ error: "server error" });
  }
});

// List all
app.get("/api/links", async (req, res) => {
  try {
    const q = await db.query(
      "SELECT code, url, clicks, last_clicked FROM links ORDER BY created_at DESC"
    );
    const rows = q.rows.map((r) => ({
      code: r.code,
      url: r.url,
      clicks: Number(r.clicks || 0),
      lastClicked: r.last_clicked
        ? new Date(r.last_clicked).toISOString()
        : null,
    }));
    res.json(rows);
  } catch (err) {
    console.error("GET /api/links error", err);
    res.status(500).json({ error: "server error" });
  }
});

// Get stats
app.get("/api/links/:code", async (req, res) => {
  const { code } = req.params;
  try {
    const q = await db.query(
      "SELECT code, url, clicks, last_clicked FROM links WHERE code = $1",
      [code]
    );
    if (q.rowCount === 0) return res.status(404).json({ error: "not found" });
    const r = q.rows[0];
    res.json({
      code: r.code,
      url: r.url,
      clicks: Number(r.clicks || 0),
      lastClicked: r.last_clicked
        ? new Date(r.last_clicked).toISOString()
        : null,
    });
  } catch (err) {
    console.error("GET /api/links/:code error", err);
    res.status(500).json({ error: "server error" });
  }
});

// Delete
app.delete("/api/links/:code", async (req, res) => {
  const { code } = req.params;
  try {
    const q = await db.query(
      "DELETE FROM links WHERE code = $1 RETURNING code",
      [code]
    );
    if (q.rowCount === 0) return res.status(404).json({ error: "not found" });
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/links/:code error", err);
    res.status(500).json({ error: "server error" });
  }
});

// Redirect route (must be after API and healthz)
app.get("/:code", async (req, res) => {
  const { code } = req.params;
  // avoid matching api or other special paths
  if (code === "api" || code === "healthz")
    return res.status(404).send("Not found");

  try {
    // Atomically increment clicks and return url
    const q = await db.query(
      `UPDATE links SET clicks = clicks + 1, last_clicked = NOW() WHERE code = $1 RETURNING url`,
      [code]
    );
    if (q.rowCount === 0) return res.status(404).send("Not found");
    const { url } = q.rows[0];
    return res.redirect(302, url);
  } catch (err) {
    console.error("GET /:code redirect error", err);
    res.status(500).send("Server error");
  }
});

const PORT = process.env.PORT || 4000;

// Start server with graceful error handling for EADDRINUSE and clean shutdown
const server = app.listen(PORT, () =>
  console.log(`Backend running on port ${PORT}`)
);

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Please stop the process using that port or set PORT to a different value.`
    );
    process.exit(1);
  }
  console.error("Server error", err);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received — closing server and DB pool");
  server.close(() => {
    if (db && db.pool) db.pool.end(() => process.exit(0));
    else process.exit(0);
  });
});
