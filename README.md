TinyLink backend (Express + Postgres)

Setup

1. Copy `.env.example` to `.env` and update `DATABASE_URL`.
2. Run the SQL in `init.sql` to create the links table:
   psql $DATABASE_URL -f init.sql
3. Install dependencies:
   npm install
4. Start server:
   npm run dev

API endpoints

- POST /api/links { url, code? }
- GET /api/links
- GET /api/links/:code
- DELETE /api/links/:code
- GET /:code (redirect)
- GET /healthz

## Repository & deployment notes

This folder is ready to push to GitHub. A few notes to prepare a safe repository and CI:

- Do NOT commit real secrets. `.env` is ignored by `.gitignore`. Use `.env.example` as a template for required variables.
- Add repository secrets on GitHub (Repository -> Settings -> Secrets) for deploys or CI if you need to run DB checks. At minimum set `DATABASE_URL` there if you plan to run integration jobs.

Continuous Integration

- A basic GitHub Actions workflow is included at `.github/workflows/node-ci.yml`. It installs dependencies and runs a small smoke check on push/pull request to `main`.

Deployment

- You can deploy this backend to services like Render, Railway, or Heroku. General steps:
  1.  Push this repository to GitHub.
  2.  Create a new service on Render/Railway and connect your GitHub repo.
  3.  Add the DATABASE_URL and any other env vars to the service (do NOT expose them in the repo).
  4.  Set the start command to `npm start` and the build command to `npm install` (Render will run install automatically).

Local setup reminder

- Copy `.env.example` to `.env` and fill in your `DATABASE_URL` and any other values. Do not commit `.env`.

If you want, I can:

- create a recommended `render.yaml` for Render.
- add a `Procfile` for Heroku.
- create a small `deploy` GitHub Action that deploys to Render using its GitHub integration (requires an API key stored in Secrets).
