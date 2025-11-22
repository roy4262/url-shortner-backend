/*
Simple spec checker for TinyLink backend. Run this while the server is running locally.
Usage:
  node check-spec.js
or
  BASE_URL=http://localhost:4000 node check-spec.js

It will perform the following checks:
- GET /healthz returns 200 and ok:true
- POST /api/links creates a link (201)
- POST with same custom code returns 409
- GET /api/links/:code returns the created record
- GET /:code returns 302 redirect
- DELETE /api/links/:code deletes and subsequent GET /:code returns 404

This script uses global fetch (Node 18+). It is intentionally lightweight.
*/

const BASE = process.env.BASE_URL || "http://localhost:4000";

async function ok(res, expectedStatus) {
  if (res.status === expectedStatus) return true;
  console.error(
    `Expected status ${expectedStatus} but got ${res.status} for ${
      res.url || ""
    }`
  );
  try {
    const txt = await res.text();
    console.error("Body:", txt);
  } catch (e) {}
  return false;
}

(async () => {
  console.log("Running spec checks against", BASE);
  // healthz
  try {
    const h = await fetch(`${BASE}/healthz`);
    if (!(await ok(h, 200))) return process.exit(2);
    const body = await h.json();
    if (!body.ok) {
      console.error("/healthz ok:false", body);
      return process.exit(2);
    }
    console.log("PASS: /healthz");

    // create link with custom code
    const code = "testA1";
    const longUrl = "https://example.com/hello?ts=" + Date.now();
    let r = await fetch(`${BASE}/api/links`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: longUrl, code }),
    });
    if (!(await ok(r, 201))) return process.exit(2);
    const created = await r.json();
    console.log("PASS: create link", created.code);

    // duplicate code should return 409
    r = await fetch(`${BASE}/api/links`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: longUrl, code }),
    });
    if (!(await ok(r, 409))) {
      console.error("Expected duplicate 409");
      return process.exit(2);
    }
    console.log("PASS: duplicate code returns 409");

    // get stats
    r = await fetch(`${BASE}/api/links/${code}`);
    if (!(await ok(r, 200))) return process.exit(2);
    const stats = await r.json();
    console.log("PASS: GET /api/links/:code", stats.code);

    // redirect
    r = await fetch(`${BASE}/${code}`, { redirect: "manual" });
    if (!(await ok(r, 302))) {
      console.error("Redirect did not produce 302");
      return process.exit(2);
    }
    console.log("PASS: redirect 302");

    // delete
    r = await fetch(`${BASE}/api/links/${code}`, { method: "DELETE" });
    if (!(await ok(r, 200))) return process.exit(2);
    console.log("PASS: delete");

    // redirect should now 404
    r = await fetch(`${BASE}/${code}`, { redirect: "manual" });
    if (!(await ok(r, 404))) {
      console.error("Expected 404 after delete");
      return process.exit(2);
    }
    console.log("PASS: redirect returns 404 after delete");

    console.log("All checks passed.");
    process.exit(0);
  } catch (err) {
    console.error("Error running checks", err);
    process.exit(2);
  }
})();
