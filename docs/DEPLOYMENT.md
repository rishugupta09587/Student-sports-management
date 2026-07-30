# Deployment Guide

Target topology: **frontend → Vercel**, **backend → Render**, **database →
MongoDB Atlas**, **files → Cloudinary**. A Docker Compose path is also
provided for self-hosting.

## 1. MongoDB Atlas & Cloudinary

Set these up first — see [`INSTALLATION.md`](INSTALLATION.md) §2–3. Note the
connection string and Cloudinary credentials; you'll paste them into Render's
environment variables below.

## 2. Backend → Render

Option A — **Blueprint** (uses the committed `backend/render.yaml`):

1. Render dashboard → New → Blueprint → point at this repo.
2. Render reads `backend/render.yaml` and provisions a web service with
   `rootDir: backend`, build command `npm ci && npm run build`, start command
   `npm start`, health check `/health`.
3. Fill in the marked `sync: false` environment variables in the Render UI:
   `MONGODB_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
   `CLOUDINARY_API_SECRET`, `CORS_ORIGINS` (set this to your Vercel URL once
   you have it, e.g. `https://sports-staff.vercel.app`).

Option B — manual web service: Root directory `backend`, build command
`npm ci && npm run build`, start command `npm start`, health check path
`/health`, Node version 20, then add the same environment variables.

Render deploys on every push to `main` by default.

## 3. Frontend → Vercel

1. Vercel dashboard → New Project → import this repo, set **Root Directory**
   to `frontend`.
2. Vercel auto-detects Vite (the committed `frontend/vercel.json` also pins
   `framework: vite`, `outputDirectory: dist`, and an SPA rewrite so client
   routes don't 404 on refresh).
3. Environment variable: `VITE_API_URL` = your Render backend URL +
   `/api/v1`, e.g. `https://sports-staff-backend.onrender.com/api/v1`.
4. Deploy. Then go back to Render and set `CORS_ORIGINS` to the resulting
   Vercel URL so the browser is allowed to call the API.

## 4. Docker (self-hosted / local all-in-one)

```bash
docker compose up --build
```

Brings up `mongo` (with a health check), `backend` (built from
`backend/Dockerfile`, multi-stage, non-root user), and `frontend` (built from
`frontend/Dockerfile`, static build served by nginx with SPA fallback and
long-cache headers on `/assets`). Set `CLOUDINARY_*` in a `.env` file at the
repo root before running, or photo/template uploads will fail.

To build and run the backend image standalone:

```bash
cd backend
docker build -t sports-staff-backend .
docker run -p 5000:5000 --env-file .env sports-staff-backend
```

And the frontend:

```bash
cd frontend
docker build -t sports-staff-frontend --build-arg VITE_API_URL=https://your-api.example.com/api/v1 .
docker run -p 8080:80 sports-staff-frontend
```

## 5. CI

`.github/workflows/ci.yml` runs on every push/PR to `main`: installs, type checks, and builds both `backend` and `frontend` independently. It doesn't
deploy — Render and Vercel handle deploys on push via their own Git
integrations.

## 6. Post-deploy checks

- `GET https://<backend>/health` → `{"status":"ok"}`
- `GET https://<backend>/api/v1/dashboard` → `{"success":true,...}`
- Open the frontend URL, confirm the dashboard loads (not an error state)
- Add a test student with a photo, generate a VTU eligibility report, confirm
  the `.docx` downloads and opens correctly
- Check Render logs for `MongoDB connected` on boot
