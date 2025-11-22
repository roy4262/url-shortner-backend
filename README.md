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

## Frontend (links & architecture)

Frontend repository: https://github.com/roy4262/url-frontend

Deployed frontend (demo): https://lambent-mandazi-bc4f70.netlify.app/

Frontend architecture (high level):

- Tech: React (Vite) + Tailwind CSS. Single-page app using React Router for client-side routes.
- Pages:
  - `/` (Dashboard) — list all links, create new links (with optional custom code), search/filter, copy/delete actions, responsive layout and client-side validation.
  - `/code/:code` (Stats) — details for a single short code (clicks, last clicked, open short link button).
  - `/healthz` — frontend health page that queries the backend `/healthz` endpoint and displays system details.
- Components: a small shared `Button` component (primary/ghost/danger variants), and page-level components under `src/pages`.
- Styling: Tailwind utility classes (no heavy CSS framework required). Short links are displayed as pill-shaped gradient buttons for visual clarity.
- Env / Integration points:
  - `VITE_API_URL` — base URL to call backend APIs (e.g., `https://bitly-self.vercel.app` or `http://localhost:4000` for local dev).
  - `VITE_SHORT_URL_BASE` — optional override for the public short URL base that the frontend should copy/open. If unset, frontend prefers `shortUrl` returned by the backend or derives it from `window.location.origin`.

Run locally (frontend)

1. cd into the frontend repo and install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` or `.env.local` with at least `VITE_API_URL` pointing to your backend. Example:
   ```env
   VITE_API_URL=http://localhost:4000
   VITE_SHORT_URL_BASE=http://localhost:4000
   ```
3. Start dev server:
   ```bash
   npm run dev
   ```

## Notes

- The frontend reads API responses and uses the backend-provided `shortUrl` when available, so the most reliable way to make shareable short links is to set the backend `SHORT_URL_BASE` environment variable to your deployed backend host.
- If you want, I can add a short section to the frontend README that documents the env vars and how to run the frontend; I can also add a CI job that runs the lightweight `check-spec.js` against a deployed backend URL.
