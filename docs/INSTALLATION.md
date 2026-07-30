# Installation Guide

## Prerequisites

- Node.js 20 or later
- A MongoDB connection — either [MongoDB Atlas](https://www.mongodb.com/atlas)
  (recommended, free tier is enough) or a local `mongod`
- A [Cloudinary](https://cloudinary.com) account (free tier) for photo and
  document storage — optional for local development if you don't need photo
  uploads or template storage, but required for those features to work

## 1. Clone and install

```bash
git clone <repo-url>
cd dsatm
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:

```ini
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/sports_staff_db?retryWrites=true&w=majority
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CORS_ORIGINS=http://localhost:5173
```

```bash
npm run dev
# → http://localhost:5000, health check at /health
```

**Don't have a MongoDB connection handy yet?** `npm run dev:local-db` starts the
API against a disposable in-memory MongoDB instead — no `MONGODB_URI` needed.
Data resets every time the process restarts, so use `npm run dev` with a real
`MONGODB_URI` for anything you want to persist.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `frontend/.env`:

```ini
VITE_API_URL=http://localhost:5000/api/v1
```

```bash
npm run dev
# → http://localhost:5173
```

Open `http://localhost:5173` — the app loads directly into the dashboard (no
login).

## 2. MongoDB Atlas setup

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Database Access → add a user with a strong password.
3. Network Access → allow your IP (or `0.0.0.0/0` for Render, which uses
   dynamic egress IPs on the free plan).
4. Connect → "Drivers" → copy the connection string into `MONGODB_URI`,
   replacing `<password>` and adding a database name (e.g. `sports_staff_db`)
   before the query string.

## 3. Cloudinary setup

1. Sign up at [cloudinary.com](https://cloudinary.com).
2. Dashboard → copy `Cloud name`, `API Key`, `API Secret` into the backend
   `.env`.
3. No bucket/folder setup needed — the app creates `sports-staff/students`,
   `sports-staff/templates`, and `sports-staff/reports` folders automatically
   on first upload.

If Cloudinary isn't configured, student/template creation without a photo
still works; uploading a photo or template will return a clear 500 error
("Cloudinary storage is not configured on this server") instead of failing
silently.

## 4. Verify the install

```bash
curl http://localhost:5000/health
# {"status":"ok",...}

curl http://localhost:5000/api/v1/dashboard
# {"success":true,"data":{"totals":{"students":0,...
```

Then open the frontend, add a student via **Students → Add Student**, and
generate a report from **Reports** to confirm the DOCX pipeline works
end-to-end.

## Common issues

| Symptom | Fix |
|---|---|
| Backend fails to start with a MongoDB timeout | Check `MONGODB_URI`, and that your IP is allow-listed in Atlas Network Access |
| Frontend shows "Could not load dashboard statistics" | Backend isn't running, or `VITE_API_URL` doesn't match the backend's actual address/port |
| Photo/template upload returns 500 "Cloudinary storage is not configured" | Fill in the three `CLOUDINARY_*` variables in `backend/.env` and restart the backend |
| CORS error in the browser console | Add your frontend's origin to `CORS_ORIGINS` in `backend/.env` (comma-separated for multiple origins) |
