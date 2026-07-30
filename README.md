# Sports Staff Data Management System

A production MERN-stack rebuild of the DSATM Sports Department's student sports
record system: student management, VTU eligibility proformas, bonafide
certificates, and reusable DOCX templates — all backed by MongoDB Atlas and
Cloudinary.

The application has **no authentication** by design: it opens directly on the
dashboard and every feature is available to anyone who can reach it. Deploy it
behind your own network/access controls if that's a concern.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/ui (Radix), Framer Motion, TanStack Query, React Hook Form + Zod, React Router |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB Atlas + Mongoose |
| File storage | Cloudinary (student photos, DOCX templates & generated reports) |
| Document generation | `docx` (VTU/HOD/tournament formats), `docxtemplater` (custom templates) |
| Deployment | Vercel (frontend), Render (backend), MongoDB Atlas |

## Project structure

```
backend/            Express + TypeScript API
  src/
    config/          env, MongoDB, Cloudinary
    models/          Mongoose schemas (Student, Sport, Template, Report, ApplicationSettings)
    validators/       Zod request schemas
    services/         business logic, DOCX generation, Cloudinary uploads
    controllers/       thin HTTP handlers
    routes/           Express routers
    middleware/       error handling, upload (multer), logging
    utils/            ApiError, ApiResponse, asyncHandler, logger

frontend/           React 19 + Vite SPA
  src/
    api/              axios client + endpoint wrappers
    hooks/            TanStack Query hooks
    components/       ui/ (shadcn primitives), layout/, dashboard/, shared/
    pages/            dashboard/, students/, reports/, templates/
    types/            shared TypeScript types mirroring the API

docs/                Architecture, API reference, migration report, checklists
web_sports_app/      Legacy Flask + PostgreSQL implementation (kept for reference only)
```

## Quick start

Requirements: Node.js 20+, a MongoDB connection (Atlas or local), and — optionally —
a Cloudinary account for photo/file storage.

```bash
# Backend
cd backend
cp .env.example .env      # fill in MONGODB_URI and Cloudinary credentials
npm install
npm run dev                # http://localhost:5000

# Frontend (separate terminal)
cd frontend
cp .env.example .env       # VITE_API_URL=http://localhost:5000/api/v1
npm install
npm run dev                 # http://localhost:5173
```

See [`docs/INSTALLATION.md`](docs/INSTALLATION.md) for full setup instructions,
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for Vercel/Render/Docker deployment,
[`docs/API.md`](docs/API.md) for the REST API reference, and
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for a system overview.

## Docker (all-in-one local stack)

```bash
docker compose up --build
# frontend: http://localhost:8080
# backend:  http://localhost:5000
# mongo:    localhost:27017
```

## Features

- **Dashboard** — live stats, branch/sport distribution charts, recent activity
- **Students** — CRUD, search/filter/sort/pagination, photo upload, CSV bulk import/export
- **Reports** — VTU Eligibility Proforma, HOD Bonafide Certificate, Tournament
  Bonafide Certificate, and a free-form custom report editor with placeholder
  substitution (`[NAME]`, `[USN]`, `[BRANCH]`, …); single/multiple/all-student
  generation; report history
- **Templates** — upload reusable `.docx` templates with `{PLACEHOLDER}` tags,
  auto-detected on upload, filled per-student on demand
- UI: dark/light theme, command palette (`Ctrl/Cmd+K`), responsive sidebar,
  loading skeletons, empty/error states, toasts

## What was migrated

This project replaces a Flask + PostgreSQL application (`web_sports_app/`) with
an equivalent-or-better MERN implementation. See
[`docs/MIGRATION_REPORT.md`](docs/MIGRATION_REPORT.md) for the full mapping of
routes, business rules, and known issues fixed along the way.
