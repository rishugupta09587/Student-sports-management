# PROJECT MASTER GUIDE

## Sports Staff Data Management System — Complete Technical Handbook

**Document purpose**: this is the single reference you need to explain, demo, defend, maintain, and extend this project without opening the source code again. Every claim in this document is based directly on the code and configuration actually present in this repository at the time of writing — nothing here is aspirational or invented.

**Repository root**: `C:\Users\Dell\dsatm`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Complete Project Overview](#2-complete-project-overview)
3. [Complete Architecture](#3-complete-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Complete Folder & File Walkthrough](#5-complete-folder--file-walkthrough)
6. [Complete Backend Walkthrough](#6-complete-backend-walkthrough)
7. [Database Deep Dive](#7-database-deep-dive)
8. [Forecasting / ML Pipeline — Not Applicable](#8-forecasting--ml-pipeline--not-applicable)
9. [Business Logic](#9-business-logic)
10. [Complete Execution Flow](#10-complete-execution-flow)
11. [Frontend Walkthrough](#11-frontend-walkthrough)
12. [Demo Guide](#12-demo-guide)
13. [Interview Guide](#13-interview-guide)
14. [Design Decisions](#14-design-decisions)
15. [Security](#15-security)
16. [Performance](#16-performance)
17. [Deployment](#17-deployment)
18. [Future Improvements](#18-future-improvements)
19. [Complete Glossary](#19-complete-glossary)
20. [Complete Command Reference](#20-complete-command-reference)
21. [Troubleshooting Guide](#21-troubleshooting-guide)
22. [Appendix](#22-appendix)

---

# 1. Executive Summary

### Project name
**Sports Staff Data Management System** (working name in code: `sports-staff-backend` / `frontend`).

### Problem statement
A college Physical Education department (Dayananda Sagar Academy of Technology and Management — DSATM) needs to track which students play which sport, and repeatedly needs to produce three specific paper documents for those students:

1. A **VTU Eligibility Proforma** — a government/university-mandated form certifying a student is eligible to represent the college in VTU inter-collegiate sports.
2. An **HOD Bonafide Certificate** — confirms a student is a genuine, currently-enrolled student, used to request attendance/leave exemption for sports participation.
3. A **Tournament Bonafide Certificate** — a cover letter + table listing students the department is sending to a specific tournament.

Historically this was done by hand or with a small, unmaintained Flask app (`web_sports_app/`) that stored data in PostgreSQL, had no way to reuse the template-fill feature it advertised, had a real off-by-one bug in one of its report tables, and had accumulated five duplicate, dead copies of its own entry point.

### Business objective
Replace the ad-hoc/legacy system with a single, reliable, modern web application that:
- Is the **one source of truth** for student sports records.
- Generates all three official documents **correctly and instantly**, for one student, many students, or the entire roster.
- Requires **no login** — any staff member on the department's machine can open it and use it immediately (explicit product requirement, not an oversight).
- Is cheap to run (free-tier MongoDB Atlas + free-tier Cloudinary + free-tier Render/Vercel) and easy to hand off to another developer.

### Target users
Physical Education department staff and the Director of Physical Education at DSATM — non-technical users who need a fast, form-based tool, not developers.

### Expected benefits
- Eliminates manual retyping of student data into Word documents for every certificate request.
- Eliminates the specific data-correctness bug present in the legacy VTU report (see [§14](#14-design-decisions) and the migration notes in [`docs/MIGRATION_REPORT.md`](docs/MIGRATION_REPORT.md)).
- Central searchable record of every student, every sport, and every certificate ever generated (report history — the legacy system had none).
- Photo management so eligibility proformas can include a student photo automatically instead of manually pasting an image into Word.

### Why this project exists
It is a **ground-up rebuild/migration** of an existing, working-but-fragile system (`web_sports_app/`, still present in this repo under that folder for reference) into a modern MERN stack, done as a full architecture and technology modernization exercise while preserving 100% of the original business rules (USN format, phone format, the three certificate layouts, the placeholder-based custom report editor).

### Real-world use case
A PE staff member opens the app, searches for "Rahul", selects him plus four other basketball players, picks "VTU Eligibility Proforma," clicks Generate, and 5 seconds later has a `.docx` file with a table containing all five students' details and photos — ready to print, sign, and submit to VTU.

---

# 2. Complete Project Overview

*(Explained as if teaching a new developer joining the team on day one.)*

This is a **two-process web application**: a REST API backend and a single-page React frontend, talking to each other over HTTP/JSON, with two external cloud services doing the heavy lifting for storage.

```
Browser  →  React SPA (Vite build)  →  Express REST API  →  MongoDB Atlas (data)
                                              │
                                              └────────────→  Cloudinary (photos, template files, generated reports)
```

There is **no user account system**. Opening the site takes you straight to a live dashboard. This is intentional (see [§1](#1-executive-summary)) — the app is meant to be used by department staff on trusted machines, not exposed as a public multi-tenant product.

The application has four functional modules, each with its own backend route file, service file, and frontend page folder:

| Module | What it does | Backend entry point | Frontend entry point |
|---|---|---|---|
| **Students** | CRUD for student sports records, search/filter/sort/paginate, photo upload, CSV bulk import/export | `backend/src/routes/student.routes.ts` | `frontend/src/pages/students/` |
| **Reports** | Generate the three fixed `.docx` certificate formats (single/multiple/all students) plus a free-form custom-content report; keeps a history of every generation | `backend/src/routes/report.routes.ts` | `frontend/src/pages/reports/` |
| **Templates** | Upload a `.docx` file containing `{PLACEHOLDER}` tags, auto-detect the tags, and later fill them in for a specific student | `backend/src/routes/template.routes.ts` | `frontend/src/pages/templates/` |
| **Dashboard** | Aggregate counts and charts (students by branch/sport/gender/blood group), recent activity feed | `backend/src/routes/dashboard.routes.ts` | `frontend/src/pages/dashboard/DashboardPage.tsx` |

Everything a user does maps to exactly one of these four route files on the backend, and one page (or a small group of pages) on the frontend. There is no hidden fifth module, no auth module, no background job system, no queue, no websocket layer — the entire system is standard synchronous request/response HTTP.

**A second, independent codebase lives in the same repo**: `web_sports_app/` is the original Flask + PostgreSQL implementation, intentionally kept (not deleted) as a historical/reference artifact. It is not run, not linked to, and not imported by anything in `backend/` or `frontend/`. Full details of what it did and how it maps onto the new system are in [`docs/MIGRATION_REPORT.md`](docs/MIGRATION_REPORT.md) and repeated in [§14](#14-design-decisions) of this document.

---

# 3. Complete Architecture

## 3.1 High-level architecture

```
┌───────────────────────┐         HTTPS / JSON          ┌─────────────────────────┐
│                        │ ─────────────────────────────▶│                          │
│   React 19 SPA          │                               │   Express REST API        │
│   (Vite build,           │ ◀─────────────────────────────│   (Node.js, TypeScript)    │
│    served by Vercel     │      JSON envelope /            │                          │
│    or nginx in Docker)  │      binary .docx download      │                          │
└───────────────────────┘                               └───────────┬──────────────┘
                                                                       │
                                                          ┌────────────┴────────────┐
                                                          │                          │
                                                Mongoose ODM               Cloudinary SDK
                                                          │                          │
                                                          ▼                          ▼
                                                ┌──────────────────┐      ┌────────────────────┐
                                                │  MongoDB Atlas     │      │     Cloudinary        │
                                                │  (sports_staff_db) │      │  student photos,       │
                                                │                    │      │  uploaded templates,   │
                                                │  collections:      │      │  generated report      │
                                                │  students, sports, │      │  files (raw resource)  │
                                                │  templates,        │      └────────────────────┘
                                                │  reports,          │
                                                │  applicationsettings│
                                                └──────────────────┘
```

## 3.2 Component diagram (ASCII)

```
frontend/src
├── App.tsx ─────────────── mounts QueryClientProvider, ThemeProvider, TooltipProvider,
│                            BrowserRouter, Toaster, lazy-loaded route Components
├── components/
│   ├── ui/       ─────────  shadcn-style primitives (Button, Dialog, Table, Select, …)
│   ├── layout/   ─────────  AppLayout, SidebarNav, CommandPalette, ThemeToggle
│   ├── dashboard/──────────  StatCard, DistributionBarChart
│   └── shared/   ─────────  PageHeader, EmptyState, ErrorState, Pagination, ConfirmDialog
├── pages/         ────────  one folder per module: dashboard/ students/ reports/ templates/
├── hooks/          ───────  TanStack Query hooks — the ONLY place components call the API
├── api/            ───────  axios wrappers, one file per backend resource
└── types/          ───────  TypeScript types mirroring backend response shapes

backend/src
├── server.ts ────────────── process entry point: connect DB → create app → listen → graceful shutdown
├── app.ts ───────────────── Express app factory: security middleware → routes → error handler
├── routes/    ───────────── thin — only wire HTTP verb + path to a controller function
├── controllers/ ─────────── parse/validate request (Zod), call a service, shape the HTTP response
├── services/   ──────────── ALL business logic lives here (the only layer that touches Mongoose models)
│   └── docx/    ─────────── one file per report layout, uses the `docx` npm package
├── models/     ──────────── Mongoose schemas
├── validators/ ──────────── Zod request schemas
├── middleware/ ──────────── errorHandler, upload (multer), requestLogger (morgan)
├── config/     ──────────── env.ts, database.ts, cloudinary.ts
└── utils/      ──────────── ApiError, ApiResponse, asyncHandler, logger (winston)
```

## 3.3 Data flow diagram — creating a student with a photo

```
[StudentFormPage.tsx]
   │  user fills form, picks a photo file
   │  react-hook-form + Zod validate client-side
   ▼
[useCreateStudent() hook]  (frontend/src/hooks/use-students.ts)
   │  calls studentsApi.createStudent(values)
   ▼
[students.api.ts: toFormData()]
   │  builds a multipart/form-data body (text fields + `photo` file)
   ▼
[axios POST /api/v1/students]  (frontend/src/api/client.ts)
   │
   ▼  (network hop)
[Express: student.routes.ts]
   │  uploadPhoto.single('photo')  ← multer, memory storage, image-type filter, 5MB limit
   ▼
[student.controller.ts → createStudent()]
   │  createStudentSchema.parse(req.body)  ← Zod: USN length 10, phone regex, etc.
   ▼
[student.service.ts → createStudent()]
   │  1. Student.findOne({usn}) → reject if duplicate (409)
   │  2. if photo file present: uploadBuffer() → Cloudinary (folder "sports-staff/students")
   │  3. Student.create({...input, photoUrl, photoPublicId})
   ▼
[MongoDB Atlas]  ← document written, unique index enforces USN uniqueness at the DB level too
   │
   ▼  (response bubbles back up)
[ApiResponse.sendSuccess()]  →  { success: true, data: <student> }  →  201 Created
   │
   ▼
[TanStack Query] invalidates the `students` query cache → StudentListPage automatically refetches
```

## 3.4 Request flow — every API call, in general

```
Client
  │
  ▼
helmet (security headers)
  │
  ▼
cors (origin allow-list check — see §15)
  │
  ▼
compression (gzip response)
  │
  ▼
express.json() / express.urlencoded()  (skipped for multipart — multer handles those routes)
  │
  ▼
requestLogger (morgan → winston)
  │
  ▼
express-rate-limit (applied to everything under /api)
  │
  ▼
route match (routes/*.routes.ts)
  │
  ▼
multer middleware (only on routes that accept file uploads)
  │
  ▼
controller (Zod validation happens FIRST inside the controller, before any service call)
  │
  ▼
service (business logic, DB/Cloudinary calls)
  │
  ├─success──▶ ApiResponse.sendSuccess() → JSON (or a raw .docx buffer for report/template generation)
  │
  └─throw───▶ next(err) → errorHandler middleware → mapped to a typed JSON error + correct HTTP status
```

## 3.5 Execution flow (process startup)

```
node dist/server.js  (or `tsx watch src/server.ts` in dev)
  │
  ▼
server.ts: bootstrap()
  │
  ├─▶ connectDatabase()        (config/database.ts — mongoose.connect(env.mongodbUri))
  │       └─ logs "MongoDB connected" via winston on the 'connected' event
  │
  ├─▶ createApp()              (app.ts — builds and returns the configured Express app; see §3.4)
  │
  ├─▶ app.listen(env.port)     → logs "Server listening on port 5000 [development]"
  │
  └─▶ registers SIGTERM/SIGINT handlers for graceful shutdown,
      and an `unhandledRejection` listener that logs but does not crash the process
```

## 3.6 Module interactions — dependency direction rule

The backend enforces a strict one-way dependency chain: `routes → controllers → services → models`. A controller **never** imports Mongoose models directly, and a service **never** touches `req`/`res`. This is what makes the code testable and lets a service (e.g. `report.service.ts`) be reused by multiple controllers without duplicating logic — though this project does not currently ship automated tests (see [§18](#18-future-improvements)).

## 3.7 Folder structure with explanation of every folder

```
dsatm/                          repo root
├── .github/workflows/          GitHub Actions CI (ci.yml — typecheck + build both apps on push/PR)
├── backend/                    Express + TypeScript REST API — see §5.2
├── frontend/                   React 19 + Vite SPA — see §5.3
├── docs/                       Standalone reference docs (README already links to all of these):
│   ├── ARCHITECTURE.md            system design, same content as §3 here in more concise form
│   ├── API.md                     REST endpoint reference
│   ├── MIGRATION_REPORT.md        Flask→MERN route/field mapping and bugs fixed
│   ├── INSTALLATION.md            local setup guide
│   ├── DEPLOYMENT.md              Vercel/Render/Docker deployment steps
│   └── CHECKLISTS.md              manual testing / production-readiness / deployment checklists
├── REPORT FORMATS/             The ORIGINAL Word documents the three DOCX generators were reverse-engineered from:
│   │                            "HOD bonifide.docx", "VTU ELE.docx", "images.jpeg" — source-of-truth reference,
│   │                            not read by any code.
├── web_sports_app/             Legacy Flask + PostgreSQL implementation — kept for historical reference only.
│   ├── app.py                     the one real/live legacy entry point (742 lines)
│   ├── cloud_storage.py           optional/never-actually-reachable S3 upload path (placeholder AWS creds)
│   ├── db.py                      psycopg2 connection helper, reads DATABASE_URL
│   ├── templates/                 Jinja2/Bootstrap HTML templates for every legacy page
│   ├── static/                    legacy CSS/JS/uploaded photos
│   └── requirements.txt           Flask==2.3.3, python-docx==0.8.11, Werkzeug==2.3.7, boto3==1.28.85,
│                                   psycopg2-binary, gunicorn
├── docker-compose.yml          local all-in-one stack: mongo + backend + frontend containers
├── .gitignore                  root-level ignore rules (venv/, __pycache__/, node_modules/, dist/, *.db, OS junk)
├── README.md                   top-level orientation doc, links into docs/
└── PROJECT_MASTER_GUIDE.md     this document
```

---

# 4. Technology Stack

For every technology: why chosen, alternatives considered, why rejected, pros/cons, and its concrete role in this repo.

## 4.1 Backend

### Node.js + Express (`express@^4.21.2`)
- **Role**: HTTP server and routing framework — `backend/src/app.ts`.
- **Why chosen**: the project needed a lightweight, unopinionated HTTP layer with a mature middleware ecosystem (helmet, cors, multer, morgan, express-rate-limit — all used here) and first-class TypeScript support via `@types/express`. It is also the default, expected choice for "MERN" specifically (the E is Express).
- **Alternatives considered**: Fastify (faster raw throughput, but smaller middleware ecosystem and this app is nowhere near throughput-bound), NestJS (more structure out of the box, but its DI/decorator style is heavier machinery than a 4-route-file API needs).
- **Why alternatives rejected**: the product spec explicitly named the MERN stack, and the project's scale doesn't benefit from NestJS's extra ceremony.
- **Pros**: huge ecosystem, simple mental model, every teammate already knows it.
- **Cons**: no built-in structure — the layered `routes/controllers/services` convention here is enforced by discipline, not the framework.

### TypeScript (`typescript@^5.7.3`, backend; `~6.0.2`, frontend)
- **Role**: static typing across the entire codebase, both backend and frontend.
- **Why chosen**: catches an entire class of bugs (wrong field names, wrong argument types, forgetting an `await`) at compile time instead of in a browser or a support ticket. Given this app moves data through five layers (route → controller → service → Mongoose model → MongoDB) and back, without types a typo three layers deep would silently produce `undefined` in a Word document.
- **Alternatives considered**: plain JavaScript with JSDoc.
- **Why rejected**: JSDoc types are weaker (no compiler enforcement at the call site) and don't buy anything TypeScript doesn't already give for free with a modern toolchain (tsx, Vite).
- **Cons**: build step required (mitigated by `tsx` for instant dev reloads and Vite for the frontend).

### MongoDB Atlas + Mongoose (`mongoose@^8.9.5`)
- **Role**: the database and its ODM (Object-Document Mapper) — `backend/src/config/database.ts`, `backend/src/models/*.ts`.
- **Why chosen**: student records are naturally document-shaped (a flat bag of optional fields per student — see [§7](#7-database-deep-dive)) with no genuine multi-table relational joins in the domain. A document database avoids the ceremony of a relational schema migration tool for a shape that will keep growing informal fields over time (the legacy system already did this: `sports` was a single free-text field). Mongoose adds schema validation, indexes, and typed models on top of the schemaless database, giving most of the safety of a relational schema without migration files.
- **Alternatives considered**: PostgreSQL (what the **legacy** `web_sports_app/` actually used, via `psycopg2`), SQLite (used briefly as `students.db` artifacts, now removed).
- **Why alternatives rejected**: the product spec explicitly called for MongoDB Atlas (the M in MERN) as part of the modernization. PostgreSQL would have been equally valid technically — the legacy system already proved it works for this exact schema — but was traded for MongoDB's simpler ops story (Atlas free tier, no separate schema migration tooling) and to fulfill the stated migration goal.
- **Pros**: flexible schema, Atlas free tier is genuinely free and zero-ops, native full-text search index used directly for the student search feature (see [§7.5](#75-indexes)).
- **Cons**: no real cross-document transactions used here (not needed — every write in this app is a single-document operation), weaker referential integrity than SQL foreign keys (`Report.studentIds` and `Report.templateId` are unenforced references — see [§7.3](#73-relationships)).

### Zod (`zod@^3.24.1` backend, `^3.25.76` frontend)
- **Role**: runtime request/form validation schema library. Backend: `backend/src/validators/*.ts`. Frontend: `frontend/src/lib/validation/student.schema.ts`.
- **Why chosen**: TypeScript types disappear at runtime — they cannot stop a malformed HTTP request body. Zod schemas validate the *actual* JSON/form-data at runtime and, as a bonus, `z.infer<>` derives the TypeScript type from the schema so the validation rule and the type can never drift apart.
- **Alternatives considered**: Joi, Yup, express-validator, manual `if` checks (what the legacy Flask app did — see `sports_department_app.py`/`web_sports_app/app.py`, e.g. `if len(usn) != 10:`).
- **Why rejected**: Joi/Yup don't produce a native TypeScript type; express-validator's middleware-chain API is more verbose for the same result; manual `if` checks are what the legacy code did and are exactly the kind of code where the off-by-one/typo bugs documented in [`docs/MIGRATION_REPORT.md`](docs/MIGRATION_REPORT.md) come from.
- **Same rule enforced twice, deliberately**: the exact same USN-length and phone-digit rules exist in both `frontend/src/lib/validation/student.schema.ts` (fast UX feedback) and `backend/src/validators/student.validator.ts` (the real, trust-boundary enforcement — never trust the client).

### Mongoose model validation (schema-level, not just Zod)
Beyond Zod, the Mongoose schemas themselves enforce `required`, `unique`, `maxlength`, `enum`, and a `match` regex on `phone` (`backend/src/models/Student.model.ts`) — a deliberate second, independent layer of validation at the database boundary, so a bug in Zod (or a future code path that bypasses the controller) still can't write bad data.

### Cloudinary (`cloudinary@^2.5.1`)
- **Role**: file storage for student photos, uploaded `.docx` templates, and generated report files — `backend/src/config/cloudinary.ts`, `backend/src/services/cloudinaryUpload.service.ts`.
- **Why chosen**: the app is deployed on Render, whose filesystem is ephemeral (any file written to local disk is lost on redeploy/restart). A managed object store is mandatory for anything meant to survive a deploy. Cloudinary specifically was chosen (over raw S3) because its free tier needs zero AWS account setup and its Node SDK's `upload_stream` API accepts a Buffer directly, matching multer's memory storage.
- **Alternatives considered**: AWS S3 (what the **legacy** `cloud_storage.py` attempted — with hardcoded placeholder credentials `AKIAIOSFODNN7EXAMPLE`, and never actually reachable in production), local disk storage (what the legacy app fell back to, and what this app's `backend/uploads/` folder exists for only as a `.gitkeep`'d, unused fallback directory).
- **Why rejected**: S3 requires an AWS account, IAM user, and bucket policy just to get started — more setup friction than the product needs; local disk storage doesn't survive a Render redeploy.
- **Pros**: single SDK call to upload, automatic CDN URL, `raw` resource type used specifically for non-image files (`.docx` templates and generated reports) since Cloudinary's default `image` pipeline would try to transform them.
- **Cons**: vendor lock-in to Cloudinary's URL format (`photoUrl` stored directly in MongoDB); if Cloudinary is unreachable, uploads fail — mitigated by `isStorageConfigured()` returning a clear `ApiError.internal('Cloudinary storage is not configured on this server')` instead of crashing (verified live during development — see the migration/testing notes).

### docx (`docx@^9.1.0`)
- **Role**: programmatically builds the three fixed-format `.docx` certificates from scratch (paragraphs, tables, embedded images) — `backend/src/services/docx/*.docx.ts`.
- **Why chosen**: the legacy system used Python's `python-docx` for exactly this purpose; `docx` (npm) is the closest direct equivalent in the Node ecosystem, with a declarative `Document({ sections: [...] })` API that maps cleanly onto `python-docx`'s procedural `doc.add_paragraph()` calls.
- **Alternatives considered**: LibreOffice headless conversion from HTML/Markdown, PDF generation via `pdfkit` and skipping Word entirely.
- **Why rejected**: LibreOffice headless requires a system binary dependency (bad fit for a serverless-style Render deploy); the product spec explicitly requires `.docx` output (VTU and the department expect editable Word documents, not PDFs, since staff still hand-fill some blanks like dates on the printed form).

### docxtemplater + pizzip (`docxtemplater@^3.60.1`, `pizzip@^3.1.7`)
- **Role**: parses an arbitrary user-uploaded `.docx` file, finds `{PLACEHOLDER}` tags inside it, and re-renders it with real data — `backend/src/services/template.service.ts`.
- **Why chosen**: a `.docx` file is a ZIP archive of XML files; `pizzip` opens that ZIP in memory (no filesystem needed — matches Cloudinary's Buffer-in/Buffer-out flow) and `docxtemplater` understands the Word XML well enough to substitute `{TAG}` occurrences without corrupting formatting, styles, or embedded images elsewhere in the document.
- **Alternatives considered**: a hand-rolled regex-and-rezip approach.
- **Why rejected**: Word's XML frequently splits a single visible `{NAME}` across multiple `<w:r>` (run) XML elements for formatting reasons; a naive regex over the raw XML would miss those and silently fail to replace the tag. `docxtemplater` specifically handles this.
- **Note on completeness vs. the legacy app**: the legacy Flask app's `/template-upload` route only *stored* an uploaded file and never actually read it back or substituted anything — this feature is fully implemented for the first time in this rebuild.

### Multer (`multer@^2.0.1`)
- **Role**: parses `multipart/form-data` request bodies (file uploads) — `backend/src/middleware/upload.ts`.
- **Why chosen**: the de facto standard Express file-upload middleware.
- **Configuration choice**: `memoryStorage()` everywhere (never `diskStorage()`) — files arrive as an in-memory `Buffer` (`req.file.buffer`) and are piped straight to Cloudinary, never touching Render's ephemeral disk.
- **Note**: originally installed at `1.4.5-lts.1`; upgraded to `2.0.1` during development specifically because 1.x has known, patched-in-2.x security advisories (`npm audit` flagged this) — see [§15](#15-security).

### Winston (`winston@^3.17.0`) + Morgan (`morgan@^1.10.0`)
- **Role**: `winston` is the structured application logger (`backend/src/utils/logger.ts`); `morgan` is HTTP access-log middleware that pipes its output through winston (`backend/src/middleware/requestLogger.ts`) instead of writing directly to stdout, so both log sources end up in one consistent format/destination.
- **Why chosen**: winston supports JSON output in production (machine-parseable, matches what a hosting platform's log aggregator expects) and colorized human-readable output in development — controlled by `env.isProduction` in `logger.ts`.
- **A real bug fixed here during development**: the original error handler logged `logger.error('Unhandled error', { err })` — but `JSON.stringify(new Error('x'))` produces `{}` because `Error.message`/`.stack` are non-enumerable properties, so every real error was being logged as an **empty object**, hiding the actual cause. Fixed in `errorHandler.ts` to explicitly extract `err.message` and `err.stack` before logging. This exact bug is what initially hid a real CORS misconfiguration during manual testing — see [§21](#21-troubleshooting-guide).

### Helmet (`helmet@^8.0.0`), CORS (`cors@^2.8.5`), express-rate-limit (`express-rate-limit@^7.5.0`), compression (`compression@^1.7.5`)
- **Role**: security headers, cross-origin access control, request-rate limiting, and gzip response compression — all wired in `backend/src/app.ts`, in that order.
- **Why chosen**: these are the standard, minimal-config Express security/perf middleware set; each does exactly one job and composes cleanly.
- **CORS specifically**: configured with a custom `origin` callback (`isAllowedOrigin()` in `app.ts`) rather than a static array, so that in development it accepts *any* `localhost`/`127.0.0.1` port (Vite falls back to 5174, 5175, … if 5173 is busy) while production is still strictly limited to `env.corsOrigins`. See [§15.4](#154-cors) for the full story of why this mattered in practice.

### csv-parse / csv-stringify (`csv-parse@^5.6.0`, `csv-stringify@^6.5.2`)
- **Role**: CSV bulk import/export for students — `backend/src/services/student.service.ts` (`importStudentsCsv`, `exportStudentsCsv`).
- **Why chosen**: robust, well-maintained, synchronous (`csv-parse/sync`, `csv-stringify/sync`) APIs that avoid stream-handling complexity for what is, at this app's data scale, always a small file.

### dotenv (`dotenv@^16.4.7`)
- **Role**: loads `backend/.env` into `process.env` at startup — `backend/src/config/env.ts`.

## 4.2 Frontend

### React 19 + Vite (`react@^19.2.8`, `vite@^8.2.0`)
- **Role**: UI library and build tool/dev server.
- **Why chosen**: React 19 was named explicitly in the product spec; Vite gives near-instant HMR (hot module reload) in dev and produces small, route-split production bundles (confirmed in the build output — see [§16](#16-performance)) via native ES modules and `esbuild`/`rollup`.
- **Alternatives considered**: Create React App (officially deprecated/unmaintained), Next.js (adds server-side rendering and a file-based router the product doesn't need — this is a pure client-rendered SPA behind a REST API, deployed statically to Vercel).
- **Why rejected**: CRA is dead; Next.js's SSR/server-components model is unnecessary complexity for an internal tool with no SEO requirement and no auth-gated server rendering need.

### TypeScript, strict mode
Frontend `tsconfig.app.json` enables `strict`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` (forces `import type` for type-only imports, keeping the compiled JS bundle free of dead type-only imports), and `erasableSyntaxOnly` (blocks TypeScript syntax, like constructor parameter-property shorthand, that isn't valid plain JavaScript once types are erased — this actually caught and required fixing a real issue in `frontend/src/api/client.ts`'s `ApiClientError` class during development).

### Tailwind CSS v4 (`tailwindcss@^4.3.3`, `@tailwindcss/vite@^4.3.3`)
- **Role**: utility-first CSS, configured via `@theme inline` CSS custom properties directly inside `frontend/src/index.css` (Tailwind v4's new CSS-native configuration model — no separate `tailwind.config.js`).
- **Why chosen**: fast to write consistent spacing/color/typography without hand-writing CSS files per component; v4 specifically chosen (over v3) because it was current at project start and its Vite plugin (`@tailwindcss/vite`) integrates with zero extra PostCSS config.

### shadcn/ui-style components on Radix UI (`@radix-ui/react-*`)
- **Role**: every primitive in `frontend/src/components/ui/` (button, dialog, table, select, dropdown-menu, command palette, sheet, tabs, checkbox, switch, avatar, tooltip, popover, scroll-area) is hand-built directly on Radix UI primitives, styled with Tailwind, following the shadcn/ui pattern (`components.json` is present and configured for it).
- **Why hand-built instead of running the `shadcn` CLI**: the CLI's `init`/`add` commands fetch component source from `ui.shadcn.com` over the network at generation time; that network call failed in the development sandbox (`ECONNRESET`), so the exact same components the CLI would have generated were written directly, using the same Radix packages and the same file/prop conventions, with no functional difference to the end result.
- **Why Radix specifically**: unstyled, fully-accessible (keyboard nav, focus trapping, ARIA attributes) primitives — building on top of them means correct accessibility behavior (e.g. `Dialog` trapping focus, `Select` keyboard navigation) comes for free instead of being hand-implemented and likely buggy.

### TanStack Query (`@tanstack/react-query@^5.101.4`)
- **Role**: server-state management — every API read/write in the app goes through a hook in `frontend/src/hooks/*.ts`, never a raw `useEffect` + `fetch`.
- **Why chosen**: automatic caching, request de-duplication, background refetch, and — critically for this app's UX — `invalidateQueries()` after every mutation (create/update/delete student, generate report, upload/delete template) so lists refresh themselves without manual state plumbing.
- **Alternatives considered**: Redux + RTK Query, plain `useEffect`/`useState` per page, SWR.
- **Why rejected**: Redux is unnecessary ceremony for a CRUD app with no complex client-only state; plain `useEffect` fetching is what produces the classic "forgot to handle loading/error/race-condition" bugs; SWR is comparable to TanStack Query but has a smaller feature set (no built-in mutation state machine).

### React Hook Form + Zod (`react-hook-form@^7.83.0`, `@hookform/resolvers@^5.5.7`)
- **Role**: the student create/edit form (`frontend/src/pages/students/StudentFormPage.tsx`) uses `useForm({ resolver: zodResolver(studentFormSchema) })`.
- **Why chosen**: uncontrolled-input-based (via refs), so it avoids a re-render on every keystroke — meaningfully faster than naive `useState`-per-field forms — and the `zodResolver` reuses the exact same Zod schema pattern as the backend, keeping client and server validation logically identical.

### React Router (`react-router-dom@^7.11.0`)
- **Role**: client-side routing — `frontend/src/App.tsx`.
- **Version note**: pinned to `7.11.0` specifically (not the latest 7.18.x) because `npm audit` flagged `GHSA-qwww-vcr4-c8h2` (an RSC-mode CSRF bypass) in `7.12.0–8.2.0`. That advisory only applies to React Router's server-actions/RSC mode, which this plain client-side SPA does not use — noted explicitly so a future maintainer doesn't "fix" the audit warning by upgrading into a still-affected version without understanding it's a non-issue here.

### Framer Motion (`framer-motion@^12.43.0`), Lucide React (`lucide-react`), React Icons (`react-icons`)
- **Role**: animation primitives and icon sets, used throughout `components/` and `pages/` for the "premium enterprise UI" requirement (hover/tap micro-interactions, consistent iconography).

### Recharts (`recharts@^3.10.1`)
- **Role**: the dashboard's `DistributionBarChart` (`frontend/src/components/dashboard/DistributionBarChart.tsx`) — horizontal bar charts for students-by-branch and students-by-sport.
- **Design note**: colors are drawn from a validated, colorblind-safe categorical palette (8 fixed hues defined as CSS variables `--chart-1` … `--chart-8` in `frontend/src/index.css`, in a specific fixed order chosen to maximize adjacent-color contrast) rather than arbitrary/cycled colors.

### Axios (`axios@^1.19.0`)
- **Role**: the one HTTP client, wrapped once in `frontend/src/api/client.ts` with a response interceptor that normalizes every backend error shape into a single `ApiClientError` class (message + status + details), so every page's error-handling code is uniform.

### Sonner (`sonner@^2.0.7`)
- **Role**: toast notifications, wired once in `frontend/src/components/ui/sonner.tsx` and fired from the mutation hooks in `hooks/*.ts` (`onSuccess`/`onError`) — pages never call `toast()` directly, keeping the "what does a failed request look like to the user" decision in one place per resource.

### cmdk (`cmdk@^1.1.1`)
- **Role**: powers the `Ctrl/Cmd+K` command palette (`frontend/src/components/layout/CommandPalette.tsx`) — fuzzy-searchable navigation and quick actions.

### date-fns (`date-fns@^4.4.0`)
- **Role**: date formatting/relative-time helpers — `frontend/src/lib/format.ts` (`formatDate`, `formatRelative`).

## 4.3 Legacy stack (for comparison — `web_sports_app/`)

| Legacy dependency | Purpose | New-system equivalent |
|---|---|---|
| `Flask==2.3.3` | web framework, server-rendered HTML | Express (API) + React (UI) |
| `python-docx==0.8.11` | Word document generation | `docx` (npm) |
| `psycopg2-binary` | PostgreSQL driver | Mongoose (MongoDB) |
| `boto3==1.28.85` | AWS S3 client (dead code path) | `cloudinary` |
| `gunicorn` | production WSGI server | Node's own HTTP server via Express |
| `Werkzeug==2.3.7` | Flask's underlying WSGI toolkit | (Node's built-in `http` module, wrapped by Express) |

## 4.4 Deployment & tooling

| Tool | Role |
|---|---|
| **Docker** (multi-stage `Dockerfile` in both `backend/` and `frontend/`) | reproducible container builds; backend runs as a non-root user; frontend is built then served by `nginx:1.27-alpine` |
| **docker-compose** (`docker-compose.yml`) | local all-in-one stack: `mongo:7`, backend, frontend, with a Mongo health check gating backend startup |
| **Render** (`backend/render.yaml`) | backend hosting — Blueprint-based, `rootDir: backend`, health check on `/health` |
| **Vercel** (`frontend/vercel.json`) | frontend hosting — SPA rewrite rule so client routes don't 404 on refresh, long-cache headers on `/assets` |
| **GitHub Actions** (`.github/workflows/ci.yml`) | CI: installs, typechecks, and builds both apps independently on every push/PR to `main`. Does not deploy — Render/Vercel deploy on push via their own Git integrations |
| **mongodb-memory-server** (backend devDependency) | spins up a disposable in-memory MongoDB for local development without needing a real Atlas connection — `npm run dev:local-db` runs `backend/dev-local.ts` |

---

# 5. Complete Folder & File Walkthrough

This section is exhaustive for every file that contains logic. Purely generated/boilerplate files (`package-lock.json`, `.gitignore` files, `dist/` build output) are named but not walked line-by-line.

## 5.1 Repo root

| File | Purpose |
|---|---|
| `README.md` | Top-level orientation: tech stack table, project structure, quick start commands, feature list, links into `docs/`. First file anyone should read. |
| `docker-compose.yml` | Defines 3 services (`mongo`, `backend`, `frontend`) with a health-checked startup order and environment variable wiring; `backend` depends on `mongo` being healthy before starting. |
| `.gitignore` | Root-level ignore rules — critically includes `venv/`, `__pycache__/`, `*.db` to prevent the Python virtualenv/bytecode cache that was previously and accidentally committed (1,010+ junk files) from ever coming back. |
| `.github/workflows/ci.yml` | Two independent jobs, `backend` and `frontend`, each: checkout → setup-node@20 with npm cache → `npm ci` → typecheck → `npm run build`. |

## 5.2 `backend/` — full walkthrough

### `backend/package.json`
Declares the Express/Mongoose/Cloudinary/docx dependency set (full list and rationale in [§4.1](#41-backend)), and these npm scripts:
- `dev` — `tsx watch src/server.ts` (auto-restart on file change, real MongoDB required via `.env`)
- `dev:local-db` — `tsx dev-local.ts` (no real MongoDB needed, see below)
- `build` — `tsc -p tsconfig.json` (emits `dist/`)
- `start` — `node dist/server.js` (what Render actually runs)
- `typecheck` — `tsc --noEmit`
- `lint` — `eslint "src/**/*.ts"`

### `backend/tsconfig.json`
Targets `ES2022`, `module: commonjs`, `moduleResolution: node`, `strict: true`, plus `noUnusedLocals`/`noUnusedParameters`/`noImplicitReturns`/`noFallthroughCasesInSwitch` — a deliberately strict configuration that treats unused variables and missing `return` statements as build-breaking errors, not warnings.

### `backend/dev-local.ts`
A standalone dev helper script (**not** part of the production `dist/` build — it's excluded because `tsconfig.json`'s `include` is `src/**/*.ts` only). It:
1. Starts a `MongoMemoryServer` (spins up a real, disposable local `mongod` binary in-process).
2. Sets `process.env.MONGODB_URI` to that instance's connection string.
3. Dynamically `import()`s `connectDatabase` and `createApp` (dynamic import, not a static one, so the env var is set *before* `config/env.ts` reads it).
4. Calls `connectDatabase()` then `app.listen(5000)`.

This exists purely so a developer (or this project's own AI-assisted development session) can run the full app end-to-end with zero external setup. Data does not persist across restarts.

### `backend/.env.example`
Documents every environment variable the app reads (see [§22.3](#223-environment-variables-reference) for the full annotated list).

### `backend/src/server.ts`
The process entry point. `bootstrap()`:
1. `await connectDatabase()`
2. `const app = createApp()`
3. `app.listen(env.port, callback)`
4. Registers `SIGTERM`/`SIGINT` → `server.close()` then `process.exit(0)` (graceful shutdown — in-flight requests finish before the process dies).
5. Registers `process.on('unhandledRejection', ...)` → logs via winston, does **not** crash the process.

If `bootstrap()` itself throws (e.g. bad `MONGODB_URI`), it's caught and logged, then `process.exit(1)`.

### `backend/src/app.ts`
`createApp(): Application` — builds and returns a configured Express app, but does **not** call `.listen()` itself (that separation is what lets `dev-local.ts` and any future test suite reuse the exact same app-construction logic against a different database). Full middleware order documented in [§3.4](#34-request-flow--every-api-call-in-general).

### `backend/src/config/env.ts`
Reads and validates environment variables into one typed `env` object. `required(name, fallback?)` throws at startup if a variable has no value and no fallback — currently only `MONGODB_URI` uses this pattern (with a `localhost` fallback for convenience, not because a missing Mongo URI should ever silently succeed in production). Also exports `isCloudinaryConfigured()`, used throughout the upload services to fail cleanly instead of crashing when Cloudinary credentials are absent.

### `backend/src/config/database.ts`
`connectDatabase()` / `disconnectDatabase()`. Sets `mongoose.set('strictQuery', true)` (queries with fields not in the schema are rejected rather than silently ignored) and attaches `connected`/`error`/`disconnected` event listeners that log via winston.

### `backend/src/config/cloudinary.ts`
Configures the Cloudinary SDK singleton **only if** `isCloudinaryConfigured()` is true — avoids the SDK throwing on missing config at import time, so the app can still boot and serve non-file-upload requests without Cloudinary credentials present.

### `backend/src/utils/logger.ts`
A single `winston.createLogger()` instance, JSON format in production, colorized simple format in development. Exported and imported everywhere logging is needed — there is exactly one logger instance in the whole process.

### `backend/src/utils/ApiError.ts`
A custom `Error` subclass carrying an HTTP `statusCode` and optional `details`. Static factory methods (`ApiError.badRequest()`, `.notFound()`, `.conflict()`, `.internal()`) are used throughout services instead of raw `throw new Error(...)`, so the error handler can always extract a correct status code.

### `backend/src/utils/ApiResponse.ts`
Two helpers, `sendSuccess(res, data, statusCode?, meta?)` and `sendError(res, statusCode, message, details?)`, that enforce the one consistent JSON envelope described in [§6.1](#61-api-response-envelope) across every controller.

### `backend/src/utils/asyncHandler.ts`
`asyncHandler(fn)` wraps an async Express route handler so any rejected promise inside it is automatically forwarded to `next(err)`. Without this, an unhandled rejection inside an `async (req, res) => {...}` route would silently hang the request rather than triggering the error middleware — every controller function in this app is wrapped in it.

### `backend/src/middleware/errorHandler.ts`
`notFoundHandler` — used as the final route-miss handler, returns a 404 with the attempted method+path.
`errorHandler` — the single central error-handling middleware (registered last in `app.ts`). Pattern-matches the thrown error's type, in this order, and maps each to the correct HTTP status + message:
1. `ApiError` → its own `.statusCode`/`.message`/`.details`
2. `ZodError` → 400, `err.flatten()` (per-field validation messages)
3. `mongoose.Error.ValidationError` → 400
4. `mongoose.Error.CastError` (e.g. a malformed MongoDB ObjectId in a URL param) → 400
5. `MongoServerError` with `code === 11000` (duplicate key) → 409, names the conflicting field
6. `multer.MulterError` (e.g. file too large, wrong type) → 400
7. anything else → logged in full (message + stack, fixed from the earlier `{}`-swallowing bug — see [§4.1](#41-backend)) and returned as a generic 500 "Internal server error" (never leaks internal error text to the client for unknown error types).

### `backend/src/middleware/upload.ts`
Three separate `multer` instances, each with `memoryStorage()` and a `fileFilter`:
- `uploadPhoto` — images only (`image/jpeg`, `image/png`, `image/webp`, `image/gif`), 5MB limit
- `uploadDocx` — `.docx` MIME type or `.docx` extension only, 10MB limit
- `uploadCsv` — `text/csv` MIME type or `.csv` extension only, 5MB limit

Kept as three distinct instances (rather than one generic uploader) so each route only accepts the exact file type it needs, and a malformed upload is rejected by `multer` itself before it ever reaches a controller.

### `backend/src/middleware/requestLogger.ts`
`morgan('dev' | 'combined', { stream: winstonStream })` — access-log format depends on `env.isProduction`; both formats are piped through winston rather than `console.log` directly.

### `backend/src/routes/index.ts`
Mounts the four resource routers under `/api/v1`: `/students`, `/reports`, `/templates`, `/dashboard`.

### `backend/src/routes/student.routes.ts`, `report.routes.ts`, `template.routes.ts`, `dashboard.routes.ts`
Each file only maps `router.<verb>(path, [multerMiddleware], controllerFunction)` — zero logic. Full endpoint-by-endpoint detail in [§6.3](#63-every-api-endpoint).

### `backend/src/controllers/*.controller.ts`
One file per resource. Each exported function is `asyncHandler`-wrapped and follows the exact same three-step shape: parse+validate with the matching Zod schema → call the matching service function → `sendSuccess`/stream a file. Controllers contain **no** business logic and **no** direct Mongoose calls.

### `backend/src/services/*.service.ts`
Where all business logic lives — walked in full in [§6.4](#64-services-the-business-logic-layer) and [§9](#9-business-logic).

### `backend/src/services/docx/*.docx.ts`
One file per report layout — walked in full in [§6.5](#65-the-docx-generation-services).

### `backend/src/validators/*.validator.ts`
Zod schemas for every request body/query the API accepts — walked in [§6.6](#66-validation-layer).

### `backend/src/models/*.model.ts`
Mongoose schemas — full field-by-field detail in [§7](#7-database-deep-dive).

### `backend/uploads/.gitkeep`
An empty placeholder file so the (otherwise-empty, unused-in-practice) `uploads/` directory exists in git. Not actually written to at runtime — all uploads go to Cloudinary via memory buffers, never to local disk. Kept as a low-risk fallback location if a future maintainer needs local-disk storage for some reason.

## 5.3 `frontend/` — full walkthrough

### `frontend/package.json`, `vite.config.ts`, `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json`
Standard Vite+TS project config. `vite.config.ts` registers the React and Tailwind Vite plugins, defines the `@` → `src/` path alias, and configures a dev-server proxy for `/api` (present for completeness/future use — the app currently calls the backend via an **absolute** `VITE_API_URL`, so this proxy is not actually on the active request path today).

### `frontend/components.json`
shadcn/ui CLI configuration (style `new-york`, base color `neutral`, path aliases) — kept even though components were hand-authored (see [§4.2](#42-frontend)) so that if network access is available later, `npx shadcn add <component>` will generate files matching this project's existing conventions.

### `frontend/src/main.tsx`
The literal DOM entry point — mounts `<App />` into `#root` inside `<StrictMode>`.

### `frontend/src/App.tsx`
- Creates one `QueryClient` (30s `staleTime`, 1 retry, no refetch-on-window-focus).
- Wraps the tree: `QueryClientProvider → ThemeProvider → TooltipProvider → BrowserRouter → Suspense → Routes`.
- Every page component is `React.lazy()`-loaded — this is the app's route-level code-splitting strategy, confirmed working by the per-page JS chunks in the production build output (e.g. `DashboardPage-*.js`, `StudentFormPage-*.js` built as separate files).
- Renders the global `<Toaster />` (Sonner) and React Query Devtools (dev-only visually, but the component itself ships in the bundle — see [§18](#18-future-improvements) for a note on this).

### `frontend/src/index.css`
Tailwind v4 entry point. Defines the entire design token system as CSS custom properties: `--background`, `--foreground`, `--primary`, etc. for light mode under `:root`, and the same variables redefined under `.dark` for dark mode — toggled by adding/removing the `dark` class on `<html>` (done in `hooks/use-theme.tsx`). Also defines the 8-color categorical chart palette (`--chart-1` … `--chart-8`) used by Recharts.

### `frontend/src/lib/utils.ts`
`cn(...)` — the standard shadcn `clsx` + `tailwind-merge` class-name combiner, used in virtually every component to merge conditional Tailwind classes without specificity conflicts.

### `frontend/src/lib/format.ts`
`formatDate()`, `formatRelative()` (both via `date-fns`), and `initials(name)` (used for `AvatarFallback` when a student has no photo).

### `frontend/src/lib/validation/student.schema.ts`
The client-side mirror of the backend's `createStudentSchema` — same USN-length, phone-regex, email, and enum rules, used by `StudentFormPage.tsx`'s `zodResolver`.

### `frontend/src/types/*.ts`
Hand-written TypeScript interfaces mirroring every backend JSON response shape (`Student`, `Report`, `Template`, `DashboardStats`, the generic `ApiSuccess<T>`/`ApiFailure` envelope). There is no runtime codegen from the backend — these are kept in sync manually, which is a documented limitation (see [§18](#18-future-improvements)).

### `frontend/src/api/client.ts`
One shared `axios.create({ baseURL: import.meta.env.VITE_API_URL })` instance, with a response interceptor that catches every failure and rethrows it as a single `ApiClientError` (`message`, `status`, `details`) — every other `api/*.ts` file and every hook can therefore assume errors always look the same shape, regardless of whether the failure was a network error, a Zod validation 400, or a 500.

### `frontend/src/api/students.api.ts`, `reports.api.ts`, `templates.api.ts`, `dashboard.api.ts`
Thin, one-function-per-endpoint wrappers around `apiClient`. `students.api.ts`'s `toFormData()` is the one non-trivial piece of logic here — converts the typed `StudentFormValues` object into a `multipart/form-data` `FormData`, omitting empty optional fields rather than sending empty strings. `reports.api.ts`'s `downloadBlob()` is the shared "trigger a browser file download from a Blob response" helper, reused by `templates.api.ts` too.

### `frontend/src/hooks/use-students.ts`, `use-reports.ts`, `use-templates.ts`, `use-dashboard.ts`, `use-debounce.ts`, `use-theme.tsx`
The **only** layer allowed to call `api/*.ts` functions. Each resource has `useX()` (query) and `useCreateX()`/`useUpdateX()`/`useDeleteX()` (mutations) hooks; every mutation's `onSuccess` fires a Sonner toast and calls `queryClient.invalidateQueries()` so every other page showing that data refreshes automatically. `use-debounce.ts` is a generic 300ms-default debounce hook used by every search box. `use-theme.tsx` implements light/dark/system theme with `localStorage` persistence and a `matchMedia` listener for `system` mode.

### `frontend/src/components/ui/*`
Hand-built Radix-based primitives (see [§4.2](#42-frontend)) — `button.tsx`, `input.tsx`, `label.tsx`, `textarea.tsx`, `card.tsx`, `badge.tsx`, `skeleton.tsx`, `separator.tsx`, `table.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `select.tsx`, `tabs.tsx`, `checkbox.tsx`, `switch.tsx`, `avatar.tsx`, `tooltip.tsx`, `popover.tsx`, `scroll-area.tsx`, `sheet.tsx`, `command.tsx`, `sonner.tsx`. None contain app-specific logic — they are the design-system layer every page is built from.

### `frontend/src/components/layout/*`
- `AppLayout.tsx` — the persistent shell: fixed sidebar (desktop) / `Sheet` drawer (mobile), sticky topbar with a command-palette trigger button and theme toggle, `<Outlet />` for the routed page content.
- `SidebarNav.tsx` — renders `NAV_ITEMS` (from `nav-items.ts`) as `NavLink`s with active-state styling.
- `CommandPalette.tsx` — global `Ctrl/Cmd+K` listener, navigation + quick-action items.
- `ThemeToggle.tsx` — a single icon button that flips `resolvedTheme` between light/dark.
- `nav-items.ts` — the single source of truth for the four top-level nav destinations, consumed by both the sidebar and the command palette so they can never drift out of sync.

### `frontend/src/components/dashboard/*`
- `StatCard.tsx` — one KPI tile (label, big number, icon, accent color).
- `DistributionBarChart.tsx` — horizontal Recharts bar chart with an empty state built in, capped at the top 8 categories.

### `frontend/src/components/shared/*`
- `PageHeader.tsx` — title/description/action-buttons row, used at the top of every page.
- `EmptyState.tsx` / `ErrorState.tsx` — the two "nothing to render" states, used identically across all four modules so the app never shows a blank white screen.
- `PageLoader.tsx` — the `Suspense` fallback (spinner) shown while a lazy page chunk loads.
- `Pagination.tsx` — page-count-aware Previous/Next control, driven purely by the backend's `meta` object.
- `ConfirmDialog.tsx` — the one reusable "are you sure?" dialog, used for every delete action (student, template).

### `frontend/src/pages/dashboard/DashboardPage.tsx`
Full walkthrough in [§11.2](#112-dashboard-page).

### `frontend/src/pages/students/StudentListPage.tsx`, `StudentFormPage.tsx`, `StudentDetailPage.tsx`
Full walkthrough in [§11.3](#113-students-pages).

### `frontend/src/pages/reports/ReportsPage.tsx`, `ReportHistoryPage.tsx`
Full walkthrough in [§11.4](#114-reports-pages).

### `frontend/src/pages/templates/TemplatesPage.tsx`
Full walkthrough in [§11.5](#115-templates-page).

### `frontend/src/pages/NotFoundPage.tsx`
Catch-all `*` route — friendly 404 with a "Back to Dashboard" button.

## 5.4 `docs/` — every file's purpose

| File | Contains |
|---|---|
| `docs/ARCHITECTURE.md` | Condensed version of this guide's §3, written as standalone reference |
| `docs/API.md` | Every endpoint, method, query params, required fields, error status meanings |
| `docs/MIGRATION_REPORT.md` | Route-by-route and field-by-field Flask→MERN mapping, plus every bug found and fixed during migration (the VTU USN off-by-one bug, the dead S3 path, the incomplete template feature, the trailing-blank-page bug, the 5 duplicate app files) |
| `docs/INSTALLATION.md` | Step-by-step local setup, MongoDB Atlas setup, Cloudinary setup, verification steps, common-issues table |
| `docs/DEPLOYMENT.md` | Render/Vercel/Docker deployment steps, CI explanation, post-deploy checks |
| `docs/CHECKLISTS.md` | Manual testing checklist, production-readiness checklist, deployment checklist |

## 5.5 `web_sports_app/` (legacy — reference only)

| File | What it did |
|---|---|
| `app.py` | The one live legacy entry point — 15 routes, all documented and mapped in [`docs/MIGRATION_REPORT.md`](docs/MIGRATION_REPORT.md) |
| `db.py` | `psycopg2.connect(os.environ["DATABASE_URL"])` — raises if unset ("designed to run on Render only") |
| `cloud_storage.py` | Optional S3 upload path, hardcoded placeholder AWS credentials, never actually reachable (`is_s3_enabled()` would fail against the placeholder bucket) |
| `templates/*.html` | Jinja2 + Bootstrap 5 server-rendered pages, one per legacy route |
| `static/dark-theme.css`, `static/theme.js` | Legacy dark-mode toggle (a `localStorage`-backed `body` class swap) |
| `requirements.txt` | See [§4.3](#43-legacy-stack-for-comparison--web_sports_app) |

---

# 6. Complete Backend Walkthrough

## 6.1 API response envelope

Every JSON response (success or failure) follows exactly one of two shapes, enforced by `ApiResponse.ts`:

```json
// success
{ "success": true, "data": { /* ... */ }, "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 } }

// failure
{ "success": false, "error": { "message": "USN already exists", "details": { /* optional */ } } }
```

`meta` is only present on paginated list endpoints. Report/template *generation* endpoints are the one exception — they return a raw binary `.docx` file (`Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`) with a `Content-Disposition: attachment` header, not the JSON envelope, because the whole point of those endpoints is a file download.

## 6.2 Middleware (full detail)

Already itemized in [§3.4](#34-request-flow--every-api-call-in-general) and [§5.2](#52-backend--full-walkthrough) — `helmet` → `cors` → `compression` → body parsers → `requestLogger` → `express-rate-limit` (300 requests / 15 minutes by default, configurable via `RATE_LIMIT_WINDOW_MS`/`RATE_LIMIT_MAX`) → routes → `notFoundHandler` → `errorHandler`.

## 6.3 Every API endpoint

Base URL: `/api/v1`.

### Students (`student.routes.ts` → `student.controller.ts` → `student.service.ts`)

#### `GET /students`
- **Input**: query params `search, branch, sport, gender, bloodGroup, semester, page, limit, sortBy, sortOrder`
- **Validation**: `listStudentsQuerySchema` — `page`/`limit` coerced to positive integers (`limit` capped at 100, default 20), `sortBy` restricted to `name|usn|branch|sport|createdAt` (default `createdAt`), `sortOrder` to `asc|desc` (default `desc`), `gender`/`bloodGroup` restricted to their enum values
- **Processing** (`listStudents()`): builds a Mongoose `FilterQuery`; if `search` is present, adds `{ $text: { $search: search } }` (uses the compound text index — see [§7.5](#75-indexes)); other filters are exact-match; applies `skip = (page-1)*limit`, `.sort()`, `.limit()`
- **DB interaction**: two queries in parallel via `Promise.all` — `Student.find(filter)...` and `Student.countDocuments(filter)` (needed to compute `totalPages`)
- **Response**: `200`, `data` = array of students, `meta` = pagination object
- **Errors**: none specific — malformed query params are silently coerced/defaulted by Zod rather than rejected (a deliberate leniency choice for a list endpoint)

#### `GET /students/:id`
- **Processing** (`getStudentById()`): `Student.findById(id)`
- **Errors**: `404 "Student not found"` if null; `400` via the generic `CastError` handler if `:id` isn't a valid ObjectId

#### `POST /students`
- **Input**: `multipart/form-data` — text fields + optional `photo` file
- **Middleware**: `uploadPhoto.single('photo')` (multer) runs before the controller
- **Validation**: `createStudentSchema` — `name` required (1–120 chars), `usn` required, trimmed, **exactly** 10 characters, uppercased; `phone` required, must match `/^\d{10}$/`; every other field optional, empty strings (`''`) are transformed to `undefined` via a shared `emptyToUndefined` preprocessor so an empty form field doesn't get stored as an empty string
- **Processing** (`createStudent()`): 1) `Student.findOne({usn})` duplicate check, 2) if `photo` present, `uploadBuffer()` to Cloudinary folder `sports-staff/students`, 3) `Student.create(...)`
- **DB interaction**: one read + one write (+ the unique index on `usn` is a second, database-level guarantee against a race between the duplicate check and the insert)
- **Response**: `201`, `data` = the created student
- **Errors**: `409 "USN already exists"` (both from the explicit pre-check and, redundantly, from the `errorHandler`'s Mongo duplicate-key (`11000`) branch if a race occurs); `400` for any Zod validation failure

#### `PUT /students/:id`
- **Input/validation**: identical shape to `POST`, via `updateStudentSchema` (currently an alias of `createStudentSchema` — full replace semantics, not partial `PATCH`)
- **Processing** (`updateStudent()`): loads the existing student (404 if missing); if the USN changed, re-checks uniqueness against every *other* document (`_id: { $ne: id }`); if a new `photo` is present, deletes the old Cloudinary asset (best-effort — failure to delete the old photo does not fail the request) then uploads the new one; `Object.assign(student, input); await student.save()` (triggers Mongoose validation on save, a second validation layer beyond Zod)
- **Response**: `200`, updated student
- **Errors**: `404`, `409` (USN conflict), `400`

#### `DELETE /students/:id`
- **Processing** (`deleteStudent()`): loads the student (404 if missing), best-effort deletes its Cloudinary photo, then `student.deleteOne()`
- **Response**: `200`, `{ id }`

#### `GET /students/export`
- **Processing** (`exportStudentsCsv()`): `Student.find().sort({name:1}).lean()`, maps each document to a fixed 12-column row (`name, usn, dob, gender, semester, branch, phone, email, motherName, fatherName, sport, bloodGroup`), `csv-stringify` with a header row
- **Response**: `200`, `Content-Type: text/csv`, `Content-Disposition: attachment; filename="students_export_<timestamp>.csv"`

#### `POST /students/import`
- **Input**: `multipart/form-data`, field `file` (`.csv`), via `uploadCsv.single('file')`
- **Processing** (`importStudentsCsv()`): `csv-parse` with `columns: true` (uses the header row as keys); iterates every row, independently validating `name`/`usn`/`phone` presence and format and checking for an existing USN — a bad row is pushed to a `skipped: [{row, reason}]` array and the loop **continues** rather than aborting the whole import
- **Response**: `200`, `{ imported: <count>, skipped: [...] }` — always 200 even if some/all rows failed, since a partial import is a valid, expected outcome, not a server error

### Reports (`report.routes.ts` → `report.controller.ts` → `report.service.ts`)

#### `GET /reports/history`
- **Input**: `page`, `limit` query params (defaults 1/20 in the controller, not Zod-validated here — a minor asymmetry noted in [§18](#18-future-improvements))
- **Processing** (`listReportHistory()`): `Report.find().sort({createdAt:-1})`, paginated the same way as students
- **Response**: `200`, `data` = array of `Report` documents, `meta` = pagination

#### `POST /reports/generate`
- **Input**: JSON body `{ studentIds: string[], format }`, via `generateReportSchema` (`format` ∈ `vtu_eligibility|hod_bonafide|tournament_bonafide|custom`, defaults to `vtu_eligibility`; `studentIds` must be a non-empty array of valid 24-char hex ObjectId strings)
- **Processing** (`generateReport()`): `Student.find({_id: {$in: studentIds}})` → 404 if none match → `buildDocxForFormat()` dispatches to the matching `docx/*.docx.ts` builder → the resulting `Buffer` is persisted (`persistReport()`: uploaded to Cloudinary as a `raw` resource **if** Cloudinary is configured, and a `Report` document is always created regardless, so history works even without Cloudinary — only the downloadable-later `fileUrl` is optional)
- **Response**: the raw `.docx` `Buffer`, `Content-Disposition: attachment; filename="<format>_report_<timestamp>.docx"`
- **Errors**: `404` if no matching students; `400` if `format === 'custom'` with no `content` (this specific endpoint doesn't accept custom content — see `/generate-custom` below)

#### `POST /reports/generate-all`
- **Input**: JSON body `{ format }` (no `custom` — validated by `generateAllReportSchema`, same enum)
- **Processing** (`generateAllStudentsReport()`): `Student.find().sort({name:1})` (**every** student in the database, no filter) → 404 if the collection is empty → same build/persist flow as above, scope `'all'`
- **Response**: `.docx`, filename `complete_<format>_report_<timestamp>.docx`

#### `POST /reports/generate-custom`
- **Input**: JSON body `{ studentIds: string[], title, content }`, via `generateCustomReportSchema` (`title` defaults to `"Custom Report"`, `content` required, min length 1)
- **Processing** (`generateCustomReport()`): fetches the selected students, calls `buildCustomReportDocx(students, content)` directly (bypasses the format dispatcher), persists with `format: 'custom'` and the raw `generatedContent` string stored on the `Report` document (so history shows exactly what template text was used)
- **Response**: `.docx`, filename derived from a slugified `title`

### Templates (`template.routes.ts` → `template.controller.ts` → `template.service.ts`)

#### `GET /templates`
- `Template.find().sort({createdAt:-1})` → `200`, array of templates (each including its auto-detected `placeholders: string[]`)

#### `GET /templates/:id`
- `Template.findById(id)` → `404` if missing → `200`

#### `POST /templates`
- **Input**: `multipart/form-data`, `name` field + `template` file (`.docx` only, via `uploadDocx.single('template')`)
- **Processing** (`uploadTemplate()`): `extractPlaceholders(buffer)` — opens the file with `PizZip` + `Docxtemplater`, throws a clean `400 "Invalid or corrupted .docx template"` if the ZIP/Word XML can't be parsed; on success, calls `doc.getFullText()` (the raw, unrendered text including literal `{TAG}` markers) and regex-matches `/\{[^{}]+\}/g`, de-duplicates the results → uploads the original buffer to Cloudinary (`raw` resource, folder `sports-staff/templates`) → `Template.create({ name, originalFilename, fileUrl, filePublicId, placeholders, sizeBytes })`
- **Response**: `201`, the created template
- **Errors**: `400` if no file, `400` if the file can't be parsed as a valid `.docx`, `500` if Cloudinary isn't configured (verified live during development — see [§21](#21-troubleshooting-guide))

#### `DELETE /templates/:id`
- Loads the template (`404` if missing), best-effort deletes its Cloudinary asset, `template.deleteOne()` → `200`, `{ id }`

#### `POST /templates/:id/generate`
- **Input**: JSON body `{ studentId }`, via `renderTemplateSchema`
- **Processing** (`renderTemplateForStudent()`): loads the `Template` (404 if missing) and the `Student` (404 if missing) → `fetch(template.fileUrl)` (downloads the original file back from Cloudinary) → re-opens it with `PizZip`/`Docxtemplater` → `doc.render(buildPlaceholderData(student))` (maps the student's fields onto fixed placeholder names: `NAME, USN, BRANCH, SEMESTER, PHONE, EMAIL, SPORT, DOB, GENDER, MOTHER_NAME, FATHER_NAME, BLOOD_GROUP`) → `doc.getZip().generate({type:'nodebuffer'})`
- **Response**: `.docx`, filename `<templateName>_<studentUsn>.docx`
- **Design note**: renders for exactly **one student per call** — a deliberate scope decision, documented in [`docs/MIGRATION_REPORT.md`](docs/MIGRATION_REPORT.md), since the three fixed report formats already cover the "many students, one document" case and templates are meant for one-off documents (leave letters, individual certificates)

### Dashboard (`dashboard.routes.ts` → `dashboard.controller.ts` → `dashboard.service.ts`)

#### `GET /dashboard`
- **Processing** (`getDashboardStats()`): seven queries run in parallel via `Promise.all` — three `countDocuments()` (students, reports, templates) and four Mongoose aggregation pipelines (`$match` non-empty field → `$group by field, $sum:1` → `$sort by count desc`) for `byBranch`, `bySport`, `byGender`, `byBloodGroup`, plus two `.find().sort({createdAt:-1}).limit(5)` queries for `recentStudents`/`recentReports`
- **Response**: `200`, one object containing `totals`, all four distribution arrays, and both recent-activity arrays — everything the dashboard page needs in exactly one HTTP round trip

### Health check
`GET /health` (no `/api/v1` prefix, not rate-limited) → `{ status: "ok", uptime, timestamp }` — used by Docker's `HEALTHCHECK` and Render's health check configuration.

## 6.4 Services — the business logic layer

Already itemized function-by-function in [§6.3](#63-every-api-endpoint) above (each endpoint entry names its service function). The organizing principle: **one service file per resource**, and the `services/docx/` subfolder isolates the one genuinely complex piece of logic (Word document construction) from the CRUD-style logic in `student.service.ts`/`template.service.ts`/`dashboard.service.ts`.

`cloudinaryUpload.service.ts` is the one cross-cutting service, used by `student.service.ts` (photos), `template.service.ts` (template files), and `report.service.ts` (generated report files) — a single `uploadBuffer(buffer, folder, resourceType)` / `deleteAsset(publicId, resourceType)` pair, with `resourceType` distinguishing `image` (photos, gets Cloudinary's image pipeline/transformations) from `raw` (`.docx` files, which must bypass image processing entirely).

## 6.5 The DOCX generation services

All four live in `backend/src/services/docx/`, each exporting one async `buildXDocx(students, ...): Promise<Buffer>` function using the `docx` npm package's `Document`/`Paragraph`/`Table`/`TableRow`/`TableCell`/`ImageRun`/`Packer` API.

### `vtuEligibility.docx.ts`
Builds a **landscape**-oriented document (`PageOrientation.LANDSCAPE`). Structure: centered bold+underlined title "ELIGIBILITY PROFORMA", a subtitle line, a college-name line (partially underlined), a "GAME" blank line, an "ORGANISING COLLEGE" blank line, then a 7-column table. Row 1 is letter headers (`A`–`G`); row 2 is category headers (`SL NO., Student Details, Course Details, Academic Details, VTU Previous, Photo, Signature`); one data row per student, with columns 2–5 as multi-line cells built from named model fields (`s.name`, `s.fatherName`, `s.motherName`, `s.branch`, `s.usn`, `s.dob`, `s.phone`, `s.sport`), and column 6 attempting to embed the student's actual photo:
```ts
if (s.photoUrl) {
  const image = await fetchImageForDocx(s.photoUrl);   // downloads bytes + sniffs file type via magic-byte header
  if (image) { /* ImageRun embedded at 90x115 */ }
  else { cell.text = 'Photo Not Found'; }
} else { cell.text = 'No Photo'; }
```
`imageHelper.ts`'s `fetchImageForDocx()` does a real `fetch(url)` against the Cloudinary URL, reads the response into a `Buffer`, and detects the image format from its magic bytes (`FFD8FF`→jpg, `89504E47`→png, `4749 46`→gif, `424D`→bmp) rather than trusting the file extension, because `docx`'s `ImageRun` requires an explicit `type` field that must match the actual byte content or Word will fail to render the image.

**This is the file where the legacy system had its real bug** — see [§14](#14-design-decisions).

### `hodBonafide.docx.ts`
Loops every selected student; for each, inserts 4 blank paragraphs, then one paragraph containing the exact legacy certificate wording (`"This is to certify that Mr/Ms {name} is a student of {branch} department..."`, 14pt/`size: 28` half-points — `docx`'s font-size unit is half-points, so 14pt = `28`), 5 more blank paragraphs, then the signature line `"Physical Education Director            Head of the Department"`. Inserts a `PageBreak` **between** students only (not after the last one — a deliberate fix of a legacy bug, see [§14](#14-design-decisions)).

### `tournamentBonafide.docx.ts`
A single-document letter (not per-student): blank paragraphs for letterhead space, `"To ."`, a bold `"Sub : List of Students participating in..."` line, two explanatory paragraphs, then a 4-column table (`Sl.No., Name, USN, Branch`) with one row per selected student, then a two-cell signature table (`Physical Education Director` left, `Principal` right-aligned).

### `customReport.docx.ts`
Exports `applyPlaceholders(content, student)` (the shared placeholder-substitution function — `[NAME]`, `[USN]`, `[BRANCH]`, `[SEMESTER]`, `[PHONE]`, `[EMAIL]`, `[SPORT]`, `[DOB]`, `[GENDER]`, `[MOTHER_NAME]`, `[FATHER_NAME]`, `[BLOOD_GROUP]`, each a simple `.replaceAll()`) and `buildCustomReportDocx(students, content)`, which runs `applyPlaceholders` per student, splits the rendered text on `\n` into one `Paragraph` per line, and inserts a `PageBreak` between (not after) students — same as the HOD bonafide fix.

## 6.6 Validation layer

`backend/src/validators/*.validator.ts` — three files, one per resource that accepts complex input (students, reports, templates; the dashboard has no input to validate).

Every schema follows the same pattern: primitive Zod types + `.trim()` + explicit `.min()`/`.max()`/`.length()`/`.regex()` constraints, with a shared `emptyToUndefined` preprocessor (`student.validator.ts`) so HTML form fields left blank don't get stored as `""`. `z.infer<typeof schema>` is exported alongside every schema so controllers get a fully-typed, already-validated object with zero extra casting.

---

# 7. Database Deep Dive

## 7.1 Why MongoDB / why this schema shape

Explained in [§4.1](#41-backend). In short: the domain has one dominant entity (Student) with many optional, loosely-structured fields and no genuine relational joins — a natural fit for a document database, and it directly mirrors the legacy PostgreSQL table's own flat-row shape (`students` table, 13 columns, no foreign keys) — the migration changed the *storage engine*, not the *data model philosophy*.

## 7.2 Every collection and field

### `students` (`Student.model.ts`)

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | auto | — | Mongo-generated primary key |
| `name` | String | ✅ | trim, maxlength 120 | |
| `usn` | String | ✅ | **unique**, trim, uppercase, minlength/maxlength 10 | University Seat Number — the natural business key, though `_id` remains the technical primary key |
| `dob` | String | — | trim | Stored as a plain string (e.g. `"2003-05-12"`), not a `Date` — matches the legacy `TEXT` column and avoids timezone-conversion surprises for a field that's always displayed, never computed on |
| `gender` | String enum | — | `Male \| Female \| Other` | |
| `semester` | String | — | trim, maxlength 20 | Free text (e.g. `"6"`), not a number — some legacy records use non-numeric semester labels |
| `branch` | String | — | trim, maxlength 100 | |
| `phone` | String | ✅ | trim, `match: /^\d{10}$/` | Stored as a string, not a number, so a leading zero is never silently dropped |
| `email` | String | — | trim, lowercase, maxlength 150 | |
| `motherName` | String | — | trim, maxlength 120 | |
| `fatherName` | String | — | trim, maxlength 120 | |
| `sport` | String | — | trim, maxlength 100 | Free text (e.g. `"Football"`) — see [§7.3](#73-relationships) for why this isn't a reference to the `Sport` collection |
| `bloodGroup` | String enum | — | `A+ A- B+ B- AB+ AB- O+ O-` | |
| `photoUrl` | String | — | — | Full Cloudinary URL |
| `photoPublicId` | String | — | — | Cloudinary's internal asset ID, needed to delete the asset later |
| `createdAt` / `updatedAt` | Date | auto | — | Mongoose `timestamps: true` |

### `sports` (`Sport.model.ts`)
A lookup collection: `name` (String, required, **unique**), `category` (String, optional), `isActive` (Boolean, default `true`), timestamps.
**Currently write-only from a UI perspective** — no route in `sport.routes.ts` exists (there is no such file); the model exists as scaffolding matching the product spec's named collection list, but the app currently stores each student's sport as free text on `Student.sport` rather than a reference into this collection. See [§14](#14-design-decisions) for the reasoning and [§18](#18-future-improvements) for the natural next step.

### `templates` (`Template.model.ts`)

| Field | Type | Notes |
|---|---|---|
| `name` | String, required | User-supplied display name |
| `originalFilename` | String, required | The uploaded file's original name |
| `fileUrl` | String, required | Cloudinary URL |
| `filePublicId` | String | for deletion |
| `placeholders` | String[] | auto-detected `{TAG}` names, default `[]` |
| `sizeBytes` | Number, required | |
| timestamps | Date | |

### `reports` (`Report.model.ts`)

| Field | Type | Notes |
|---|---|---|
| `format` | String enum, required | `vtu_eligibility \| hod_bonafide \| tournament_bonafide \| custom` |
| `scope` | String enum, required | `single \| multiple \| all` |
| `studentIds` | ObjectId[], ref `Student` | unenforced reference (see [§7.3](#73-relationships)) |
| `studentCount` | Number, required, default 0 | denormalized count, avoids re-deriving `studentIds.length` everywhere it's displayed |
| `fileUrl` | String | optional — only set if Cloudinary is configured |
| `filePublicId` | String | optional |
| `fileName` | String, required | |
| `templateId` | ObjectId, ref `Template` | optional, currently unused by any write path (reserved for a future "generated from this template" link) |
| `generatedContent` | String | only populated for `format: 'custom'` — stores the raw placeholder text used |
| timestamps | Date | |

### `applicationsettings` (`ApplicationSettings.model.ts`)
A **singleton** document pattern: `key` (String, required, unique, default `'default'`), `collegeName` (default: the full DSATM name and address), `collegeAddress`, `academicYear` (default `'2025-26'`), `defaultReportFormat` (default `'vtu_eligibility'`). Only `updatedAt` is tracked (`timestamps: { createdAt: false, updatedAt: true }`) since a settings document logically has no "creation" moment worth recording.
**Currently unread/unwritten by any route** — no `settings.routes.ts` exists yet. The model exists to satisfy the product spec's named collection and as the obvious next step for making the hardcoded college name in `vtuEligibility.docx.ts` configurable — see [§18](#18-future-improvements).

## 7.3 Relationships

There are **no foreign-key constraints** — this is normal and expected for MongoDB. Two soft references exist, both via Mongoose's `ref` option (which only affects `.populate()` behavior, not integrity enforcement):
- `Report.studentIds[]` → `Student._id` — if a referenced student is later deleted, the `Report` document is **not** updated or deleted; the report history simply shows a student count/IDs that may no longer all resolve. This is an accepted tradeoff (report history is a historical record — it shouldn't retroactively change because a student record was later removed).
- `Report.templateId` → `Template._id` — same non-enforcement, currently unused.

## 7.4 CRUD operations — where each lives

Every CRUD operation for every collection is implemented directly with the Mongoose model inside the matching `services/*.service.ts` file (never in a controller, never in a route file) — see [§6.3](#63-every-api-endpoint) for the exact Mongoose call used by every single endpoint.

## 7.5 Indexes

Defined directly on the `Student` schema (`Student.model.ts`):
```ts
studentSchema.index({ name: 'text', usn: 'text', branch: 'text', sport: 'text' });  // compound text index
studentSchema.index({ branch: 1 });
studentSchema.index({ sport: 1 });
studentSchema.index({ createdAt: -1 });
```
Plus the implicit unique index Mongoose creates automatically from `usn: { unique: true }`.

**Why these four**: the compound **text index** across `name`/`usn`/`branch`/`sport` is what powers the single search box on the Students list page (`GET /students?search=...` → `{ $text: { $search: search } }`) — one index serves free-text search across all four fields simultaneously, rather than needing separate regex scans. The single-field indexes on `branch`, `sport`, and `createdAt` support the list page's exact-match filters and the default (and dashboard's recent-activity) sort order, so those queries don't require a full collection scan as the student count grows.

Indexes are created automatically by Mongoose the first time the app connects to a fresh database — no manual migration step is required, but on an existing large collection they should be verified with `db.students.getIndexes()` after first deploy (documented in [`docs/CHECKLISTS.md`](docs/CHECKLISTS.md)).

## 7.6 Query flow example — the search box

```
StudentListPage.tsx: user types "raj"
   │  useDebounce(search, 350) — waits 350ms of no typing
   ▼
useStudents({ search: "raj", page: 1, limit: 10, sortBy: "createdAt", sortOrder: "desc" })
   ▼
GET /api/v1/students?search=raj&page=1&limit=10&sortBy=createdAt&sortOrder=desc
   ▼
listStudentsQuerySchema.parse(req.query)   ← coerces page/limit to numbers, defaults sortBy/sortOrder
   ▼
listStudents(query):
   filter = { $text: { $search: "raj" } }
   Student.find(filter).sort({createdAt:-1}).skip(0).limit(10)   ← uses the text index
   Student.countDocuments(filter)                                 ← run in parallel
   ▼
{ success: true, data: [...], meta: { page:1, limit:10, total:3, totalPages:1 } }
```

## 7.7 Why this schema was designed this way — summary

1. **Flat, mostly-optional fields on Student** — mirrors the real-world form (most fields are "nice to have," only name/USN/phone are load-bearing for the business process), and mirrors the legacy schema so the migration didn't need to invent new business rules.
2. **`usn` as a unique string, not the primary key** — MongoDB's `_id` is always the primary key; `usn` is a secondary unique business key, which is the correct pattern (never repurpose a natural key as the technical primary key — USNs can theoretically be corrected/reissued, `_id` never should be).
3. **Denormalized `studentCount` on `Report`** — a deliberate, small, intentional denormalization for a value that's read far more often (every report-history row) than it's written (once, at creation).
4. **Singleton `ApplicationSettings`** — avoids a global-config table needing its own CRUD UI; a single well-known document (`key: 'default'`) is simpler to reason about than a key-value settings table for the handful of values this app needs.

---

# 8. Forecasting / ML Pipeline — Not Applicable

**This project contains no forecasting, machine learning, dataset, model artifact, or inventory-simulation code.** There is no `models/` directory of trained ML artifacts, no dataset files, no training script, no WMAPE/win-rate metric, and no inventory/demand-forecasting logic anywhere in `backend/`, `frontend/`, or `web_sports_app/`.

This section is retained (rather than deleted) only to explicitly and honestly answer the request for it, per this document's own governing rule: *"Do not invent functionality that doesn't exist."* If a future version of this product needs a forecasting/ML capability, it does not exist yet anywhere in this codebase, and nothing in this document should be read as implying otherwise.

The closest concept this project actually has — turning input data into a generated output document via a defined pipeline — is the **DOCX report generation pipeline**, which is fully documented in [§6.5](#65-the-docx-generation-services) and [§9](#9-business-logic): student selection → data validation → document construction → binary output → persisted history record. If you are asked in an interview or demo about "the pipeline," that is the pipeline this project has.

---

# 9. Business Logic

Every business rule in the system, and why it exists.

### Rule: USN must be exactly 10 characters
**Where enforced**: `backend/src/validators/student.validator.ts` (`z.string().trim().length(10, ...)`), `backend/src/models/Student.model.ts` (`minlength: 10, maxlength: 10`), and client-side in `frontend/src/lib/validation/student.schema.ts`.
**Why**: matches the real VTU/university USN format (e.g. `1DA21CS045`) — a fixed-length institutional identifier. This rule existed identically in the legacy Flask app (`if len(usn) != 10:`); it was preserved exactly, not reinterpreted.

### Rule: USN is always stored uppercase
**Where**: `Student.model.ts` schema option `uppercase: true`, and explicitly again in the Zod transform (`.transform(v => v.toUpperCase())`).
**Why**: USNs are conventionally written in caps; normalizing on write means a search or a duplicate-check for `"1da21cs045"` and `"1DA21CS045"` always match the same record — the legacy system had no such normalization and could theoretically have stored the same student twice under different casings.

### Rule: USN must be globally unique
**Where**: enforced three ways — a MongoDB unique index (the ultimate guarantee, race-condition-proof), an explicit pre-check in `student.service.ts` (`createStudent`/`updateStudent`, gives a clean `409` instead of a raw duplicate-key error surfacing first), and the `errorHandler`'s dedicated `MongoServerError` code `11000` branch as a safety net if the pre-check and the write ever race.
**Why**: one student = one real person = one certificate identity; a duplicate would produce two different certificate paper trails for the same person.

### Rule: Phone number must be exactly 10 digits
**Where**: `/^\d{10}$/` in both the backend Zod schema, the Mongoose schema `match`, and the frontend Zod schema.
**Why**: matches the Indian mobile number format the legacy system assumed (`if not phone.isdigit() or len(phone) != 10:`), preserved exactly.

### Rule: A photo replaces (not adds to) the previous photo
**Where**: `student.service.ts`'s `updateStudent()` — if a new `photo` file is present, the old Cloudinary asset (`photoPublicId`) is deleted (best-effort, failure doesn't block the update) before the new one is uploaded.
**Why**: prevents unbounded storage growth from repeated edits, and a student only logically has one current photo.

### Rule: A CSV import never aborts on one bad row
**Where**: `student.service.ts`'s `importStudentsCsv()` — each row is validated and inserted independently inside the loop; a failure is recorded in `skipped[]` and the loop continues.
**Why**: bulk imports of real-world spreadsheets routinely have a handful of malformed rows (a typo'd USN, a missing phone); aborting the whole batch over one bad row would force staff to fix data one row at a time via trial and error instead of getting immediate, complete feedback on every problem row at once.

### Rule: Report generation always records history, even without Cloudinary configured
**Where**: `report.service.ts`'s `persistReport()` — the Cloudinary upload is wrapped in its own `isStorageConfigured()` check and `.catch(() => null)`, but the `Report.create(...)` call always runs regardless.
**Why**: the primary deliverable of report generation is the immediate file download the user gets right now; a downloadable-later copy is a nice-to-have. History (who generated what, when, for how many students) should never be lost just because optional cloud storage isn't set up — a deliberate degrade-gracefully design.

### Rule: `PageBreak` goes **between** students, never after the last one
**Where**: `hodBonafide.docx.ts` and `customReport.docx.ts` — `if (index < students.length - 1) { children.push(new Paragraph({ children: [new PageBreak()] })) }`.
**Why**: the legacy Flask code inserted an unconditional `doc.add_page_break()` after every student including the last, producing a trailing blank page in every multi-student bonafide certificate. Fixed during migration as a correctness improvement, documented in [`docs/MIGRATION_REPORT.md`](docs/MIGRATION_REPORT.md).

### Rule: VTU Eligibility table uses named student fields, never positional array indices
**Where**: `vtuEligibility.docx.ts` — every value pulled via `s.usn`, `s.branch`, etc.
**Why**: this is the single most important correctness fix in the whole migration. The legacy code built each row from a raw SQL tuple and read `student[6]` intending to print the USN — but column index 6 in the table's own `CREATE TABLE` order is actually `semester`, not `usn` (index 7). Every VTU eligibility certificate the legacy system ever generated for multiple students had the wrong value printed in the USN line. Using named Mongoose document fields instead of positional tuple indices makes this entire bug class structurally impossible to reintroduce.

### Rule: Custom report placeholders use square brackets (`[NAME]`), template placeholders use curly braces (`{NAME}`)
**Where**: `customReport.docx.ts` (`[TAG]`) vs. `template.service.ts`/`docxtemplater` (`{TAG}`, the library's default delimiter).
**Why**: these are two intentionally separate features with two different underlying implementations (simple string `.replaceAll()` vs. a real Word-XML-aware templating engine), and the bracket style makes it visually unambiguous to a staff member which feature a given blank document was written for. The custom-report placeholder syntax (`[NAME]`) was also carried over unchanged from the legacy app's own `edit-report`/`generate_edited_report` feature, which already used square brackets.

### Rule: A student search is one text index across four fields, not four separate filters
**Where**: `student.service.ts`'s `listStudents()` — `search` maps to a single `$text` operator; `branch`/`sport`/`gender`/`bloodGroup`/`semester` are separate, independent exact-match filters that can combine with a search.
**Why**: staff searching "who is this" almost never know in advance whether they're typing a name, a USN, a branch, or a sport — one search box that matches across all of them is the correct UX; the exact-match filters exist for the different, deliberate use case of narrowing an already-known category (e.g. "show me all Football players").

### Rule: No authentication anywhere in the system
**Where**: absent by design — no login route, no session/JWT middleware, no protected-route wrapper on the frontend.
**Why**: explicit product requirement (see [§1](#1-executive-summary)) — the system is meant for trusted, shared-machine use by department staff, matching the legacy system's own behavior (it also had no auth). Full discussion of the implications in [§15](#15-security).

---

# 10. Complete Execution Flow

*What happens, in exact order, if you run this project today from a clean checkout.*

## 10.1 Backend — `npm run dev` (with a real `MONGODB_URI` in `backend/.env`)

1. `tsx watch src/server.ts` starts — `tsx` transpiles TypeScript to JS on the fly (no separate build step in dev).
2. `server.ts` module loads: imports `createApp` from `app.ts`, `env` from `config/env.ts`, `connectDatabase` from `config/database.ts`, `logger` from `utils/logger.ts`.
3. `config/env.ts` runs `dotenv.config()` (loads `backend/.env`), then builds the `env` object — if `MONGODB_URI` is genuinely missing *and* no fallback existed, this would throw immediately; in practice a `localhost` fallback exists so this never blocks startup, it just means a misconfigured `.env` fails later, at the actual connection attempt, with a clearer error.
4. `bootstrap()` runs: `await connectDatabase()` — Mongoose attempts a TCP connection to Atlas (or wherever `MONGODB_URI` points); on success, the `'connected'` event handler logs `"MongoDB connected"`.
5. `createApp()` runs synchronously — builds the full middleware stack and mounts all four routers (see [§3.4](#34-request-flow--every-api-call-in-general)) — **no database or network activity happens during this step**, it's pure Express configuration.
6. `app.listen(5000)` binds the TCP port; the callback logs `"Server listening on port 5000 [development]"`.
7. `SIGTERM`/`SIGINT` and `unhandledRejection` handlers are registered — the process is now idle, waiting for HTTP requests.
8. Every subsequent HTTP request follows the flow in [§3.4](#34-request-flow--every-api-call-in-general).

## 10.2 Backend — `npm run dev:local-db` (no real MongoDB needed)

Identical to above, except `dev-local.ts` runs first: it starts an in-process `MongoMemoryServer`, sets `MONGODB_URI` in `process.env` to that instance's URI, then dynamically imports and runs the same `connectDatabase()`/`createApp()`/`.listen()` sequence. Functionally identical from the second step onward; the only difference is where the data physically lives (RAM, gone on process exit, vs. a real persistent Atlas cluster).

## 10.3 Frontend — `npm run dev`

1. `vite` starts, reads `vite.config.ts` (React + Tailwind plugins, `@` alias, dev proxy config), reads `frontend/.env` (`VITE_API_URL`).
2. Vite's dev server starts on port 5173 (or the next free port if busy — see [§21](#21-troubleshooting-guide)) and begins serving `index.html`, which loads `src/main.tsx` as an ES module.
3. `main.tsx` renders `<App />` into `#root`.
4. `App.tsx` sets up the `QueryClient`, theme, tooltip, and router providers, then renders the matched route — on `/`, that's the lazily-imported `DashboardPage`, which triggers its `useDashboard()` query, which fires `GET /api/v1/dashboard` against `VITE_API_URL`.
5. From this point on, every user click follows the request flow documented in [§3.3](#33-data-flow-diagram--creating-a-student-with-a-photo) (for mutations) or the equivalent read-path (TanStack Query `useQuery` → `axios` → backend → cache).

## 10.4 Production build

- **Backend**: `npm run build` → `tsc -p tsconfig.json` emits plain JS into `backend/dist/`; `npm start` → `node dist/server.js` (no `tsx`, no on-the-fly transpilation in production).
- **Frontend**: `npm run build` → `tsc -b` (typecheck, no emit) then `vite build` → static, route-code-split, minified assets into `frontend/dist/`, served by any static file server (nginx in the Docker image, Vercel's edge network in the hosted deployment).

## 10.5 Report generation execution flow (concrete example)

*"Generate a VTU Eligibility Proforma for 2 selected students," start to finish:*

1. User is on `ReportsPage.tsx`, has checked 2 students in the picker table, `format` state is `'vtu_eligibility'`.
2. Clicks "Generate & Download" → `handleGenerate()` → `generateReport.mutate({ studentIds: [id1, id2], format: 'vtu_eligibility' })`.
3. `useGenerateReport()` hook calls `reportsApi.generateReport(ids, format)`.
4. `axios.post('/reports/generate', {...}, { responseType: 'blob' })`.
5. Backend: `student.routes.ts`… wait, `report.routes.ts` → `generateReport` controller → `generateReportSchema.parse(req.body)` (Zod validates the 2 ObjectId strings and the format enum).
6. `report.service.ts`'s `generateReport()`: `Student.find({_id: {$in: ids}})` fetches both full student documents from MongoDB.
7. `buildDocxForFormat('vtu_eligibility', students)` → dispatches to `buildVtuEligibilityDocx(students)`.
8. For each student with a `photoUrl`, `fetchImageForDocx(url)` does a real outbound HTTP `fetch` to Cloudinary to download the actual photo bytes, synchronously, before the table row can be finished.
9. `Packer.toBuffer(doc)` serializes the entire in-memory `Document` object graph into a real `.docx` binary `Buffer`.
10. `persistReport()`: if Cloudinary is configured, the buffer is also uploaded there as a `raw` resource; either way, a `Report` document is written to MongoDB recording this generation event.
11. The controller streams the `Buffer` back with `Content-Type`/`Content-Disposition` headers.
12. Frontend: `axios` receives the blob, `downloadBlob()` creates an `<a>` tag with a `blob:` object URL and programmatically clicks it, triggering the browser's native file-save/download behavior.
13. `onSuccess` fires a Sonner toast: "Report generated and downloaded."

---

# 11. Frontend Walkthrough

## 11.1 Global shell — every page shares this

`AppLayout.tsx`: a desktop sidebar (`SidebarNav`, always visible ≥ `lg` breakpoint) or a mobile `Sheet` drawer (triggered by a hamburger button), a sticky topbar (search/command-palette trigger button + `ThemeToggle`), and `<Outlet />` for the active page. Every page therefore only needs to render its own content — navigation chrome, theme, and the command palette are never re-implemented per page.

## 11.2 Dashboard page

**File**: `frontend/src/pages/dashboard/DashboardPage.tsx`.
**State**: entirely server state via `useDashboard()` (`useQuery`, `refetchInterval: 60_000` — auto-refreshes every minute while the tab is open).
**API call**: one `GET /api/v1/dashboard`.
**What renders**:
- A `PageHeader` with an "Add Student" button (links to `/students/new`).
- Loading: 4 skeleton tiles while the first fetch is in flight.
- Error: `ErrorState` with a retry button.
- Success: 4 `StatCard`s (Total Students, Reports Generated, Templates, Sports Represented — the last one derived client-side as `data.bySport.length`), two `DistributionBarChart`s (by branch, by sport), a "Recently Added Students" list (avatar, name, USN, sport badge, relative time, clickable through to the student's detail page) and a "Recent Reports" list (format label, student count, relative time).
**User interactions**: clicking a recent student navigates to `/students/:id`; clicking "Add Student" navigates to `/students/new`.

## 11.3 Students pages

### `StudentListPage.tsx`
**State**: `search` (debounced 350ms), `gender`/`bloodGroup` filter selects, `sortBy`, `page`, a `Set<string>` of selected student IDs, plus dialog-open state for delete-confirm and CSV import.
**API calls**: `GET /students` (via `useStudents(params)`, re-fetches whenever any filter/sort/page state changes), `DELETE /students/:id`, `GET /students/export`, `POST /students/import`.
**What renders**: search box, gender/blood-group/sort selects, a bulk-action bar (appears only when ≥1 row is checked — "Generate Report" / "Clear") a table with a select-all checkbox column, avatar+name (links to detail), USN, branch, sport badge, phone, and a per-row dropdown (View / Edit / Delete), pagination footer, an Import dialog (file picker + column-format help text), a delete `ConfirmDialog`.
**Forms**: none directly (create/edit is a separate page).
**Navigation**: row click → `/students/:id`; dropdown "Edit" → `/students/:id/edit`; "Add Student" button → `/students/new`; "Generate Report" on the bulk-action bar → `navigate('/reports', { state: { studentIds: [...] } })` — passes the selection to the Reports page via React Router's location state, no global store needed.
**Error handling**: `ErrorState` with retry on list-load failure; every mutation surfaces its error as a Sonner toast (via the shared `onError` handlers in `use-students.ts`).

### `StudentFormPage.tsx`
Handles **both** create (`/students/new`) and edit (`/students/:id/edit`) — `isEdit = Boolean(useParams().id)`.
**State**: `react-hook-form` (`useForm` with `zodResolver(studentFormSchema)`), plus local `photoFile`/`photoPreview` state (an `URL.createObjectURL()` preview shown before upload completes).
**API calls**: `GET /students/:id` (edit mode only, to prefill the form via `reset()` inside a `useEffect`), then `POST /students` or `PUT /students/:id` on submit.
**What renders**: an avatar with a "Change/Upload Photo" button, a two-column responsive grid of every student field (text inputs, two `Select`s for gender/blood group, a date input for DOB), Cancel/Save buttons.
**Validation**: client-side via the shared Zod schema — inline error messages appear under each invalid field before any network call happens; the same rules are re-enforced server-side regardless.
**Navigation on success**: create → `/students/:newId`; edit → `/students/:id` (both land on the detail page to show the result immediately).

### `StudentDetailPage.tsx`
**API calls**: `GET /students/:id`, `DELETE /students/:id`.
**What renders**: a photo/avatar card with sport/gender/blood-group badges and quick contact info, an "Academic Details" card, a "Family & Contact" card, and a "Timeline" card showing created/updated dates as a small vertical timeline (only shows "Last updated" if `updatedAt !== createdAt`).
**User interactions**: "Generate Report" button → navigates to `/reports` with this one student pre-selected (same `location.state` mechanism as the list page); "Edit" → `/students/:id/edit`; "Delete" → `ConfirmDialog` → on confirm, deletes and navigates back to `/students`.

## 11.4 Reports pages

### `ReportsPage.tsx`
**State**: reads `location.state.studentIds` on mount to pre-populate the selection (set from either the Students list bulk-action bar or a single student's detail page); a `Set<string>` selection that persists across the picker's own internal search/pagination; `format` (for the "Select Students" tab) and a separate `allFormat` (for the "All Students" tab, deliberately excludes `custom` since a free-form report needs per-student content control that doesn't make sense applied identically to every student in the database); `customTitle`/`customContent` (pre-filled with the same default certificate wording the legacy app used).
**API calls**: `GET /students` (the picker, its own independent paginated/searchable query, separate from the main Students list page's query), `POST /reports/generate`, `POST /reports/generate-all`, `POST /reports/generate-custom`.
**What renders**: two `Tabs` — "Select Students" (a searchable, paginated, checkbox-selectable student table + a format-selection sidebar card that reveals a title+content textarea when `format === 'custom'`, with the full placeholder-token list shown as help text) and "All Students" (a simpler format-only card, three fixed formats).
**Business value demonstrated**: this page is where the core value proposition of the whole app is delivered — turning a search-and-select action into an instant, correctly-formatted, downloadable official document.

### `ReportHistoryPage.tsx`
**API call**: `GET /reports/history` (paginated).
**What renders**: a table of every past generation — format, scope (badge), student count, filename, relative generation time.
**Why it exists**: the legacy system had no equivalent — no way to answer "did we already generate a bonafide for this student this week?" — this page closes that gap.

## 11.5 Templates page

**File**: `TemplatesPage.tsx`.
**State**: upload dialog state (`name`, `file`), delete-confirm target, generate-dialog target (which template) plus its own embedded student search/select state.
**API calls**: `GET /templates`, `POST /templates`, `DELETE /templates/:id`, `POST /templates/:id/generate`, plus `GET /students` (for the in-dialog student picker when generating).
**What renders**: a responsive card grid — one card per template, showing its name, original filename, formatted file size, and every detected `{placeholder}` as a badge; each card has "Generate" (opens a dialog to pick a student, live-searched) and a delete icon button; an "Upload Template" dialog with inline help explaining the `{PLACEHOLDER}` convention.
**Empty state**: explains the feature (upload a `.docx` with `{NAME}`/`{USN}`-style tags) rather than just saying "no data."

---

# 12. Demo Guide

## 12.1 Pre-demo setup checklist
- [ ] Backend running (`npm run dev` with a real `MONGODB_URI`, or `npm run dev:local-db` for a disposable local run) — confirm `GET /health` returns `{"status":"ok"}`
- [ ] Frontend running (`npm run dev`), confirm it loaded the dashboard without an error state
- [ ] At least 3–5 students already seeded, spanning at least 2 branches and 2 sports, at least one with a real photo (so the VTU report's photo embedding is visible)
- [ ] Cloudinary configured (photo upload and template upload will otherwise correctly, but visibly, fail with a clear error — decide in advance whether you want to demo that failure mode intentionally)
- [ ] Have one ready-made `.docx` file with `{NAME}`/`{USN}` placeholders on hand for the Templates demo

## 12.2 Screen-by-screen guide

### Screen: Dashboard (`/`)
- **What appears**: 4 stat tiles, two bar charts (by branch, by sport), recent students, recent reports.
- **What to say**: *"This is the landing screen — no login, because this tool is used by trusted department staff on a shared machine. Everything here is live data, refreshing automatically every minute."*
- **What happens internally**: one `GET /api/v1/dashboard` call, backed by 7 parallel MongoDB queries (3 counts, 4 aggregations).
- **Business value**: at-a-glance department overview without opening a spreadsheet.

### Screen: Students list (`/students`)
- **What to say**: *"Every student sports record lives here. I can search by name, USN, branch, or sport — it's one text index doing all four."* Type a partial name, show instant (debounced) results.
- **Internally**: `GET /students?search=...` uses the MongoDB compound text index.
- **Business value**: replaces a paper register / disorganized spreadsheet.

### Screen: Add Student (`/students/new`)
- **What to say**: *"USN and phone have hard validation — exactly 10 characters, exactly 10 digits — matching the university's actual format. That's enforced both here in the browser, instantly, and again on the server, so it can never be bypassed."* Upload a photo, show the live preview.
- **Internally**: client Zod validation → `POST /students` (multipart) → server Zod validation → Cloudinary upload → MongoDB insert.
- **Business value**: eliminates hand-typing the same student data into a Word document every time a certificate is needed.

### Screen: Select students → Reports (`/reports`)
- **What to say**: *"I'll select these two students and generate a VTU Eligibility Proforma."* Check 2 students, pick the format, click Generate, open the downloaded `.docx` live.
- **Internally**: `POST /reports/generate` → students fetched → `docx` package builds the table (including each student's photo, downloaded from Cloudinary on the fly) → file streamed back → also saved to Report History.
- **Business value**: this is the single most time-saving feature in the app — a document that used to take manual retyping now takes one click.

### Screen: Custom Report tab
- **What to say**: *"For anything that isn't one of the three fixed formats, staff can write their own letter with placeholders like `[NAME]` and `[BRANCH]`, and it gets substituted per student automatically."*
- **Internally**: `POST /reports/generate-custom`, `applyPlaceholders()`.
- **Business value**: covers the long tail of one-off letters without needing a developer to add a new hardcoded format.

### Screen: Report History (`/reports/history`)
- **What to say**: *"Every certificate ever generated is logged here — the old system had no record of this at all."*

### Screen: Templates (`/templates`)
- **What to say**: *"Staff can upload their own Word template with `{PLACEHOLDER}` tags — the app detects the tags automatically on upload."* Upload the prepared sample file, show the detected placeholder badges, then generate it for one student and open the filled result.
- **Internally**: `POST /templates` → `docxtemplater` parses the real Word XML to find `{TAG}`s → `POST /templates/:id/generate` re-opens the file and substitutes real data.
- **Business value**: staff can create new document types themselves, with zero developer involvement — the legacy system advertised this feature but never actually implemented the substitution step.

## 12.3 15–20 minute presentation script

1. **(1 min) Context** — "This replaces a legacy Flask app the PE department was using — same data, same three certificate formats, rebuilt as a modern app with a few real bugs fixed along the way."
2. **(2 min) Dashboard** — orient the audience, explain the no-login decision.
3. **(4 min) Students module** — search, add a student with a photo, edit, show the validation rules firing.
4. **(5 min) Reports module** — the centerpiece: select students, generate a VTU Eligibility Proforma, open the real `.docx`, point out the embedded photo; then generate an HOD Bonafide for all students at once; show Report History.
5. **(4 min) Templates module** — upload a `.docx` with placeholders, generate it for a student, open the result.
6. **(2 min) Architecture close** — one slide/diagram: React SPA → Express API → MongoDB Atlas + Cloudinary; mention no auth is intentional, mention the CSV import/export for bulk onboarding a whole roster at once.
7. **(2 min) Q&A buffer.**

---

# 13. Interview Guide

## 13.1 Project explanation

**Q: Walk me through this project in two minutes.**
A: It's a MERN-stack rebuild of a legacy Flask/PostgreSQL app for a college's sports department. Staff manage student sports records and generate three official Word documents — a VTU eligibility form, an HOD bonafide certificate, and a tournament bonafide letter — either for one student, a selected group, or the whole roster. It also supports uploading arbitrary Word templates with placeholder tags that get auto-filled per student. No authentication, by design — it's an internal tool for trusted staff. Backend is Express/TypeScript/MongoDB/Cloudinary; frontend is React 19/Vite/Tailwind/TanStack Query.
*Follow-up: "Why no auth?"* → see [§15.1](#151-authentication).
*Strong answer marker*: mention the specific real bug fixed during migration (the USN off-by-one in the VTU table) — shows you actually understand the old code, not just the new one.

## 13.2 Architecture

**Q: Why a layered backend (routes/controllers/services/models) instead of putting logic directly in route handlers?**
A: Separation of concerns and testability. Routes only wire HTTP to a function; controllers only parse/validate and shape the response; services hold all business logic and are the only layer touching Mongoose. This means `report.service.ts`'s logic could be reused by a future CLI script or a test suite without dragging Express `req`/`res` objects through it, and it means a bug in "how do I generate a VTU report" is always in exactly one place.

**Q: Why does the frontend never call `fetch`/`axios` directly from a component?**
A: Every API call goes through a TanStack Query hook in `hooks/`. This gives automatic caching, de-duplication, and — critically — `invalidateQueries()` on every mutation, so after creating a student, every page showing student data refreshes itself without manual prop-drilling or a global event bus.

**Q: What would you change about the architecture if this had to scale to 50,000 students?**
A: The list/search queries already use proper MongoDB indexes (see [§7.5](#75-indexes)), so read scaling is largely handled. The main thing I'd change is DOCX generation for "all students" — currently it loads every student into memory and builds one giant document synchronously inside the request; at real scale that should move to a background job (a queue + worker) with the client polling or getting notified when the file is ready, rather than holding an HTTP connection open for a multi-thousand-row Word document.

## 13.3 Backend

**Q: How does error handling work end-to-end?**
A: Every controller is wrapped in `asyncHandler`, so any thrown error (or rejected promise) is forwarded to Express's `next(err)`. One central `errorHandler` middleware pattern-matches the error type — a custom `ApiError` with an explicit status code, a Zod validation error, a Mongoose validation/cast error, a Mongo duplicate-key error, a Multer upload error — and maps each to the right HTTP status and a consistent JSON shape. Anything unrecognized becomes a generic 500, and is logged with its real message and stack trace (a bug I actually hit and fixed: the original logger call passed the raw `Error` object to `JSON.stringify` indirectly through winston's metadata, which silently produces `{}` since `Error.message` isn't enumerable — I now explicitly extract `.message`/`.stack` before logging).

**Q: Why Zod instead of just TypeScript types for validation?**
A: TypeScript types don't exist at runtime — they can't stop a malformed HTTP request. Zod validates the actual incoming JSON/form data and derives the TypeScript type from the schema (`z.infer`), so the validation rule and the type can never drift apart, which is what happens with hand-written `interface` + separate manual `if` checks.

## 13.4 Database

**Q: Why MongoDB over the PostgreSQL the legacy app used?**
A: See [§4.1](#41-backend) in full — short version: the data is naturally document-shaped with no real relational joins, and the product spec explicitly asked for MongoDB as part of the MERN modernization. PostgreSQL was equally valid technically; the legacy system proved that.

**Q: Walk me through your indexing strategy.**
A: A unique index on `usn` (both correctness and a fast duplicate check), a compound text index across `name/usn/branch/sport` powering the single search box with `$text`, and single-field indexes on `branch`, `sport`, and `createdAt` for the list page's filters and default sort — all defined declaratively on the Mongoose schema and created automatically on first connect.

**Q: How do you prevent duplicate USNs under concurrent requests?**
A: Two layers — an application-level pre-check (`Student.findOne({usn})`) for a fast, clean `409` in the common case, and a MongoDB-level unique index as the real guarantee against a race condition between two near-simultaneous requests, caught in the central error handler's `code === 11000` branch.

## 13.5 "ML/forecasting explanation"
This project has no ML or forecasting component — see [§8](#8-forecasting--ml-pipeline--not-applicable). If asked about it directly, the honest answer is: *"This project doesn't include a forecasting or ML pipeline — it's a CRUD + document-generation system. The closest analogous thing is the DOCX generation pipeline, which deterministically transforms selected student records into a formatted output document."*

## 13.6 Business explanation

**Q: What real bug did you fix during the migration, and how did you find it?**
A: The legacy VTU Eligibility table built its USN column from a raw SQL row tuple, `student[6]`, but the table's actual column order put `usn` at index 7 (index 6 was `semester`) — so every multi-student VTU certificate the old system ever generated had the wrong value in the USN field. I found it by comparing the code's own adjacent lines (which correctly used index 5 for branch, matching the `CREATE TABLE` order) against the USN line, and confirmed it's structurally impossible to reintroduce in the new system because report generation now reads named fields off a typed Mongoose document (`s.usn`), not a positional array.

**Q: Why does the custom report use `[NAME]` but the template feature uses `{NAME}`?**
A: They're deliberately two different features. `[NAME]`-style substitution is a simple string `.replaceAll()` I carried over unchanged from the legacy app's own "edit report" feature. `{NAME}`-style substitution goes through `docxtemplater`, a real Word-XML-aware templating engine needed because a visible `{NAME}` in a Word document is often split across multiple XML runs internally — a plain string replace on the raw file would miss it.

## 13.7 Deployment explanation

**Q: Walk me through your deployment topology.**
A: Frontend on Vercel (static build, SPA rewrite so client routes don't 404 on refresh), backend on Render (Node web service, health-checked on `/health`), MongoDB Atlas, Cloudinary for files. There's also a Docker Compose path for fully self-hosted deployment — multi-stage Dockerfiles, nginx serving the built frontend, a non-root user in the backend image. CI on GitHub Actions typechecks and builds both apps on every push but doesn't deploy — Render and Vercel each deploy on push via their own Git integration.

## 13.8 Level-graded question bank

**Beginner**
- What does REST stand for and how does this API follow it? (Resources as nouns — `/students`, `/reports`; HTTP verbs as actions — `GET`/`POST`/`PUT`/`DELETE`.)
- What's the difference between `props` and `state` in React, and give an example of each from this codebase. (`props`: `StatCard`'s `label`/`value`/`icon`; `state`: `StudentListPage`'s `search`/`page`.)
- What is a 404 vs a 400 vs a 500, and where does each occur in this app?

**Intermediate**
- Why is `photoFile` handled with `FormData` instead of JSON? (Binary file data can't be represented in JSON; `multipart/form-data` is the standard encoding for mixed text+file bodies, and `multer` on the backend is built specifically to parse it.)
- Explain the difference between the Zod validation on the frontend and the Zod validation on the backend — is the frontend one enough? (No — it's a UX convenience only; the backend one is the real trust boundary, since a client can always be bypassed by calling the API directly.)
- How does `TanStack Query`'s cache invalidation keep the UI in sync after a mutation, concretely, in this codebase? (`onSuccess` in each mutation hook calls `queryClient.invalidateQueries({queryKey: studentKeys.all})`, which marks every cached query under that key stale and triggers a refetch for any currently-mounted component using it.)

**Senior**
- This app currently has no automated tests. What would you prioritize testing first, and why? (Service-layer unit tests for `report.service.ts`'s format dispatch and `student.service.ts`'s USN-uniqueness/CSV-import edge cases — the highest business-risk, most logic-dense code, with no UI dependency, cheapest to test in isolation.)
- The `Sport` and `ApplicationSettings` models exist but have no routes. Is that dead code, and how would you decide whether to finish or remove them? (Not dead in the sense of unreachable/broken — they're intentional scaffolding matching the product's named collection list, ready for the natural next feature: a managed sport list instead of free text, and a settings screen instead of a hardcoded college name in `vtuEligibility.docx.ts`. The decision criterion is whether the product actually needs configurable college info / a curated sport list soon; if not, they should be removed to avoid confusing a future maintainer, per YAGNI.)
- Walk through a race condition this system could still have despite the USN uniqueness safeguards. (Two simultaneous `PUT` requests updating the *same* student's non-USN fields — Mongoose's `findById` + `.save()` pattern in `updateStudent()` is a read-modify-write with no optimistic concurrency check, so the second write silently overwrites the first's changes to other fields. A fix would be a Mongoose versioned document (`optimisticConcurrency: true`) or an atomic `findOneAndUpdate`.)

---

# 14. Design Decisions

Each entry: decision → why → alternatives rejected → tradeoffs.

### Decision: No authentication
**Why**: explicit product requirement — the system replaces a legacy tool that also had none, for a single trusted-staff use case.
**Alternatives rejected**: session-based login, JWT, OAuth — all explicitly out of scope per the product brief.
**Tradeoffs**: zero login friction, zero auth-related code to maintain or get wrong — but anyone who can reach the URL has full read/write access to every student record and can generate any certificate. Acceptable only because deployment is expected to be access-controlled at the network/hosting layer, not the app layer (see [§15](#15-security)).

### Decision: MongoDB over the legacy PostgreSQL
Covered fully in [§4.1](#41-backend). Tradeoff: gave up relational foreign-key integrity (`Report.studentIds` is unenforced) in exchange for schema flexibility and a simpler ops story (Atlas free tier).

### Decision: Cloudinary over S3 or local disk
Covered fully in [§4.1](#41-backend). Tradeoff: vendor lock-in to Cloudinary's URL/API shape, in exchange for zero-setup managed storage that survives Render's ephemeral filesystem.

### Decision: Named Mongoose fields instead of positional data anywhere in report generation
**Why**: directly motivated by the legacy USN-off-by-one bug ([§9](#9-business-logic), [§14](#14-design-decisions) example above). Using `s.usn` instead of `student[7]` makes an entire bug class structurally unreachable.
**Tradeoff**: none meaningful — this has no real downside; it's strictly safer and equally fast.

### Decision: Hand-building shadcn/ui components instead of using the CLI
**Why**: the CLI's network fetch to `ui.shadcn.com` failed in the development environment.
**Tradeoff**: components had to be manually kept consistent with shadcn's conventions rather than auto-generated; `components.json` is still present so a future `npx shadcn add` works normally once network access is available, without needing to reconcile conflicting conventions.

### Decision: Report/template generation is synchronous, in-request
**Why**: simplicity — at this app's realistic scale (a college department's roster, not tens of thousands of students), building even an "all students" document takes well under a second server-side.
**Alternatives rejected**: a background job queue (BullMQ/Redis) with polling or webhooks.
**Tradeoffs / scalability implication**: this is the one part of the system that would need to change first if the scale assumption ever changed significantly — see [§13.2](#132-architecture) and [§18](#18-future-improvements).

### Decision: One text index for search instead of separate per-field search
**Why**: staff don't know in advance which field they're searching by; one box, one index, matches the real usage pattern.
**Tradeoff**: MongoDB's `$text` search has weaker ranking/relevance controls than a dedicated search engine (Elasticsearch/Atlas Search) — acceptable at this data scale, would need revisiting only if search quality became a real complaint at much larger data volumes.

### Decision: CSV import continues past bad rows instead of all-or-nothing
Covered in [§9](#9-business-logic). Tradeoff: a single mixed-quality CSV can leave the database in a partially-imported state — mitigated by returning a complete `skipped[]` report so staff know exactly what to fix and re-import, rather than guessing.

### Decision: `Sport` and `ApplicationSettings` collections exist without routes yet
**Why**: scaffolded to match the product's stated data model (Collections: Students, Sports, Reports, Templates, ApplicationSettings) ahead of the features that will actually use them.
**Tradeoff**: technically unused code sitting in the repo — a legitimate criticism, addressed head-on in [§13.8](#138-level-graded-question-bank) (senior question) and flagged as a concrete next step in [§18](#18-future-improvements) rather than hidden.

---

# 15. Security

## 15.1 Authentication
**None.** No login, no session, no JWT, anywhere in `backend/` or `frontend/`. This is an explicit, documented product decision (see [§1](#1-executive-summary), [§14](#14-design-decisions)), not an oversight. **Implication**: this application must never be deployed on a publicly reachable URL without an additional access-control layer (VPN, IP allowlist, a reverse-proxy basic-auth gate, or similar) in front of it, since anyone who can reach it has full read/write access to every student record and can generate any certificate.

## 15.2 Authorization
**None** — there are no roles, no permission checks; every endpoint is equally reachable by anyone who can reach the API. This is the direct consequence of §15.1.

## 15.3 Secrets and environment variables
All secrets (`MONGODB_URI`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) are read exclusively from environment variables via `backend/src/config/env.ts` / `dotenv`. `backend/.env` and `frontend/.env` are both listed in their respective `.gitignore` files — never committed. `.env.example` files document the *shape* of required variables with no real values. **A real secret was found and neutralized in the legacy code** (`web_sports_app/cloud_storage.py`) — but it's AWS's own well-known public documentation placeholder key (`AKIAIOSFODNN7EXAMPLE`), not an actual leaked credential; still, that file (and the entire S3 code path it belongs to) was never wired into the new system, deliberately.

## 15.4 CORS
Configured in `backend/src/app.ts` with a custom origin-checking function rather than a static allowlist array. In production, only origins listed in `env.corsOrigins` (from `CORS_ORIGINS`) are allowed. In development, any `http(s)://localhost:<port>` or `http(s)://127.0.0.1:<port>` origin is also accepted automatically. **This exact setting caused and then fixed a real bug** during development: the frontend's dev server fell back to port 5174 (5173 was occupied by an unrelated process), but `CORS_ORIGINS` was hardcoded to `5173` — every browser request was silently blocked by CORS while direct `curl` requests (which don't send an `Origin` header) worked fine, making it initially look like "the dashboard isn't loading" for no visible server-side reason. Fixed by making the dev-mode origin check pattern-based instead of a fixed list. See [§21](#21-troubleshooting-guide) for the full diagnosis story.

## 15.5 Database security
MongoDB Atlas connection uses a username/password-authenticated connection string over TLS (`mongodb+srv://`). Network Access in Atlas must be configured to allow the deploying host's IP (Render's free tier uses dynamic egress IPs, so `0.0.0.0/0` is the documented, pragmatic recommendation in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — a real tradeoff, not an oversight: Atlas still requires the correct database credentials even with a fully open IP allowlist).

## 15.6 API security
- `helmet` sets standard security headers (CSP, `X-Content-Type-Options`, `X-Frame-Options`, HSTS, etc.) on every response.
- `express-rate-limit` caps requests per IP (default 300 per 15-minute window, configurable) on everything under `/api`, mitigating basic abuse/brute-force/DoS patterns.
- Every request body/query is validated by Zod *before* touching any business logic — rejects malformed input at the boundary rather than letting it propagate.
- File uploads are type- and size-restricted at the `multer` layer (images ≤5MB, `.docx` ≤10MB, `.csv` ≤5MB) before any file content is even read.

## 15.7 Input validation
Covered extensively in [§6.6](#66-validation-layer) and [§9](#9-business-logic) — Zod at the API boundary, Mongoose schema validation as a second independent layer, and a mirrored Zod schema client-side for UX only (never trusted as the real check).

## 15.8 Potential vulnerabilities (honest assessment)
- **No auth/authz** (§15.1/§15.2) — the single largest actual risk, entirely by design; safe only behind network-level access control.
- **No CSRF protection** — not currently needed because there is no cookie-based session to hijack (the API is stateless, credentialless from the browser's perspective), but would become necessary the moment any session-based auth is added.
- **`react-router-dom` pinned below latest** due to `GHSA-qwww-vcr4-c8h2` — confirmed non-exploitable in this app's actual usage (no RSC/server-actions mode is used), but documented explicitly in [§4.2](#42-frontend) so a future upgrade decision is informed, not accidental.
- **Multer upgraded from 1.x to 2.x** specifically because 1.x had known, patched advisories — resolved, not a live issue.
- **No output encoding concerns beyond React's default JSX escaping** — React escapes all rendered text by default; the codebase contains no `dangerouslySetInnerHTML` usage anywhere, so there is no known XSS vector from student-supplied data (names, USNs, etc.) being rendered back into the UI.
- **Cloudinary URLs are publicly readable** (student photos, uploaded templates, generated reports are all stored with default public access) — acceptable for this deployment's threat model (an internal tool, no PII more sensitive than name/phone/branch/photo) but worth flagging explicitly: anyone who obtains a `photoUrl`/`fileUrl` can view that asset without authentication, since Cloudinary URLs themselves aren't secret-token-gated in this implementation.

## 15.9 Recommended improvements
See [§18](#18-future-improvements) for the full list; the two most relevant to security specifically are: (1) if this is ever deployed somewhere not already access-controlled at the network layer, add a lightweight shared-password gate at minimum; (2) rotate to signed, expiring Cloudinary URLs if photo/document confidentiality ever becomes a real requirement.

---

# 16. Performance

## 16.1 Current optimizations

**Backend**:
- `compression` middleware gzips every JSON/text response.
- MongoDB indexes ([§7.5](#75-indexes)) keep the list/search/sort queries from scanning the full collection as data grows.
- File uploads use `multer.memoryStorage()` — no disk I/O round-trip before forwarding to Cloudinary.
- Dashboard stats run all 7 queries via `Promise.all` (parallel, not sequential) — confirmed in `dashboard.service.ts`.
- Report/student list endpoints run their data query and count query in parallel (`Promise.all`) rather than sequentially awaiting each.

**Frontend**:
- Route-level code splitting via `React.lazy()` for every page — confirmed by the production build output producing separate JS chunks per page (`DashboardPage-*.js`, `StudentFormPage-*.js`, etc.) instead of one monolithic bundle.
- TanStack Query caching (`staleTime: 30_000`) avoids redundant refetches when navigating back to an already-visited page within 30 seconds.
- Debounced search input (350ms via `useDebounce`) avoids firing an API request on every keystroke.
- `React Hook Form`'s uncontrolled-input model avoids a full component re-render on every keystroke in the student form (a meaningful difference from a naive `useState`-per-field implementation).
- Tailwind's build-time purge (inherent to v4's engine) ships only the CSS classes actually used, not the full utility library.

## 16.2 Known bottlenecks
- **Report generation is fully synchronous and in-memory**, including outbound `fetch()` calls to Cloudinary for every embedded photo in a VTU Eligibility document — for a very large "generate all students" call, this means one HTTP request holding open a connection while sequentially downloading N photos and building one large in-memory `Document` object. At this app's real-world scale (a college department roster, realistically tens to low hundreds of students) this is fast; it is the first thing that would need to move to a background job if the scale assumption changed (see [§13.2](#132-architecture), [§18](#18-future-improvements)).
- **No pagination on `GET /templates`** — returns every template unconditionally. Acceptable because the number of templates a department realistically uploads is small (tens, not thousands), but noted as an inconsistency versus the students/reports endpoints, which are both paginated.
- **No server-side caching layer** (e.g. Redis) — every dashboard load re-runs all 7 MongoDB queries; acceptable given the 60-second client-side `refetchInterval` already limits how often that happens per open tab, and the queries are all indexed/cheap.

## 16.3 Memory usage
Report generation buffers an entire `.docx` file (and every embedded photo) in process memory before responding — for this app's realistic student counts this is on the order of low megabytes per request, not a practical concern, but it is the reason "all students" report generation is the specific feature flagged as the scaling limit above.

## 16.4 Time complexity
- Student list/search: `O(log n)` index lookup + `O(page size)` result construction, thanks to the indexes in [§7.5](#75-indexes) — not a full collection scan.
- CSV import: `O(n)` in the number of rows, with one `findOne` uniqueness check per row (each itself an indexed `O(log n)` lookup) — so `O(n log n)` overall for an import of `n` rows.
- Report generation: `O(k)` in the number of selected students, plus one network round-trip per student photo (the dominant real-world cost, since it's network I/O, not CPU).

## 16.5 Query optimization
Already covered — the compound text index and single-field indexes in [§7.5](#75-indexes) are the primary optimization; `.lean()` is used specifically in the CSV export path (`student.service.ts`'s `exportStudentsCsv`) since that path only reads plain data and doesn't need full Mongoose document instances (hydration overhead avoided for what can be the largest single query result set in the app).

## 16.6 Scaling strategy
For the realistic scale of "one college department," the current architecture has substantial headroom — see [§13.2](#132-architecture) for the concrete first move (background jobs for bulk report generation) if that assumption ever changes, and [§18](#18-future-improvements) for the fuller list.

---

# 17. Deployment

Fully detailed in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) and [`docs/INSTALLATION.md`](docs/INSTALLATION.md); summarized and cross-referenced here.

## 17.1 Local setup
See [§20](#20-complete-command-reference) for the exact command sequence. Two paths: a real `MONGODB_URI` (persistent), or `npm run dev:local-db` (disposable in-memory Mongo, zero external setup).

## 17.2 Production deployment topology
- **Frontend → Vercel**: root directory `frontend`, Vite auto-detected, `VITE_API_URL` env var pointed at the live backend, `frontend/vercel.json` provides the SPA rewrite rule and asset cache headers.
- **Backend → Render**: `backend/render.yaml` Blueprint, `rootDir: backend`, build `npm ci && npm run build`, start `npm start`, health check `/health`.
- **Database → MongoDB Atlas**, **Files → Cloudinary** — both external managed services, no self-hosting.
- **Self-hosted alternative → Docker Compose** (`docker-compose.yml`) — `mongo:7` + backend + frontend (nginx-served static build) as three containers on one Docker network.

## 17.3 Environment variables
Full annotated reference in [§22.3](#223-environment-variables-reference).

## 17.4 Build process
Backend: `tsc` (TypeScript → JS, `dist/`). Frontend: `tsc -b` (typecheck only, no emit) then `vite build` (bundling/minification/code-splitting → `dist/`).

## 17.5 CI/CD
`.github/workflows/ci.yml` — two independent jobs (`backend`, `frontend`), each installs, typechecks, and builds on every push/PR to `main`. **Does not deploy** — that's delegated entirely to Render's and Vercel's own Git-push-triggered deployment, which is a deliberate simplicity choice (no deploy secrets/tokens need to live in GitHub Actions at all).

## 17.6 Monitoring
Nothing beyond the platforms' own built-in dashboards (Render's service metrics/logs, Vercel's deployment logs, Atlas's cluster metrics) — there is no dedicated APM/error-tracking tool (e.g. Sentry) wired in. Flagged explicitly as a gap in [§18](#18-future-improvements).

## 17.7 Logging
`winston`, JSON format in production (machine-parseable by a hosting platform's log viewer), colorized human-readable format in development — see [§4.1](#41-backend) and [§6.2](#62-middleware-full-detail).

---

# 18. Future Improvements

### Features to add
- Wire up the already-modeled `Sport` collection as a real managed list (with a small CRUD UI) instead of free-text `Student.sport`, enabling accurate `bySport` filtering without relying on staff typing consistent spelling.
- Wire up `ApplicationSettings` so the hardcoded college name/address in `vtuEligibility.docx.ts` and `hodBonafide.docx.ts` becomes editable from a settings screen instead of a code change.
- A basic activity/audit log beyond report history (who edited which student, when) — currently `updatedAt` exists per-student but there's no change history.
- Batch template generation (currently one student per template render — see [§6.3](#63-every-api-endpoint)).

### Architecture improvements
- Move report generation (especially "all students") to a background job queue with a job-status endpoint the frontend can poll, removing the synchronous-in-request bottleneck discussed in [§16.2](#162-known-bottlenecks).
- Add a lightweight, opt-in access-control layer (even a single shared password gate) so the app can be safely exposed beyond a fully trusted local network without a larger authentication project.

### Performance improvements
- Cache dashboard aggregation results for a short TTL server-side (Redis or in-memory) if concurrent dashboard usage ever grows beyond a handful of simultaneous staff.
- Paginate `GET /templates` for consistency with the students/reports endpoints.

### ML improvements
Not applicable — see [§8](#8-forecasting--ml-pipeline--not-applicable). If a future forecasting/analytics feature is added (e.g. sport participation trend prediction), it would be built from scratch as new scope, not an extension of anything currently present.

### Business improvements
- A "duplicate detection" assist beyond exact-USN matching (e.g. fuzzy name+DOB matching) to catch accidental double-entries with a typo'd USN.
- Configurable report templates for the three fixed formats (currently hardcoded layouts in `services/docx/*.docx.ts`) so wording/table structure changes don't require a code deploy.

### Production readiness improvements
- Automated test suite (unit tests for services, integration tests for the API routes — none currently exist; see [§13.8](#138-level-graded-question-bank) senior question for prioritization reasoning).
- Error-tracking/APM integration (Sentry or equivalent) — currently only platform-native logs exist ([§17.6](#176-monitoring)).
- Signed/expiring Cloudinary URLs if photo/document confidentiality requirements ever tighten ([§15.8](#158-potential-vulnerabilities-honest-assessment)).
- Optimistic concurrency control on `Student` updates to close the race condition described in [§13.8](#138-level-graded-question-bank) (senior question).

---

# 19. Complete Glossary

| Term | Plain-language explanation |
|---|---|
| **API** | Application Programming Interface — the set of URLs (`/api/v1/students`, etc.) the frontend uses to ask the backend for data or tell it to do something. |
| **REST** | A style of API design where URLs represent "things" (resources, e.g. a student) and HTTP verbs (`GET`/`POST`/`PUT`/`DELETE`) represent actions on them. |
| **CRUD** | Create, Read, Update, Delete — the four basic data operations every resource in this app supports. |
| **Mongoose** | A library that lets Node.js talk to MongoDB using defined "schemas" (shapes) instead of raw, unchecked documents. |
| **Schema** | The defined shape/rules for a piece of data — e.g. `Student.model.ts` says a student must have a `name` and a 10-character `usn`. |
| **Document** (MongoDB) | One record in a MongoDB collection — roughly equivalent to "a row" in a SQL table, but stored as JSON-like data (BSON) instead of fixed columns. |
| **Collection** (MongoDB) | A group of documents of the same kind — roughly equivalent to "a table" in SQL. This app has `students`, `sports`, `templates`, `reports`, `applicationsettings`. |
| **Index** | A special data structure the database maintains so it can find matching documents fast, without checking every single one. |
| **ObjectId** | MongoDB's default unique ID format for a document (a 24-character hex string), stored in the `_id` field. |
| **Zod** | A library that checks incoming data actually matches the shape/rules you expect, at the moment the program is running (not just when it's compiled). |
| **TypeScript** | A version of JavaScript that adds type-checking — catches many bugs (wrong data shape, typos) before the code ever runs. |
| **Middleware** (Express) | A function that runs on every (or some) incoming request before it reaches the actual route logic — e.g. `helmet` adds security headers, `cors` checks the request's origin. |
| **Multer** | The library that reads file uploads (like a student photo) out of an incoming HTTP request. |
| **Cloudinary** | A cloud service that stores files (photos, Word documents) and gives back a URL to access them — used instead of saving files on the server's own disk, which doesn't survive a redeploy. |
| **Buffer** (Node.js) | Raw binary data held in memory — how an uploaded file or a generated `.docx` is represented before it's sent somewhere. |
| **React** | A JavaScript library for building the user interface out of reusable pieces called "components." |
| **Component** (React) | A reusable piece of UI, e.g. `<Button>`, `<StudentListPage>`. |
| **Hook** (React) | A function starting with `use` that lets a component use React features like state (`useState`) or, in this app, data-fetching (`useStudents()`). |
| **State** | Data that can change over time and causes the UI to re-render when it does — e.g. which page of the student list is currently shown. |
| **Props** | Data passed into a component from its parent, e.g. `<StatCard label="Total Students" value={12} />`. |
| **TanStack Query** | A library that manages "server state" in React — fetching, caching, and automatically refreshing data from the API. |
| **Mutation** (TanStack Query) | A request that *changes* server data (create/update/delete), as opposed to a "query" which only reads it. |
| **Cache invalidation** | Telling TanStack Query "the data you have cached might be stale now — go fetch it again" — done automatically after every mutation in this app. |
| **Vite** | A fast frontend build tool/dev server used instead of older tools like Webpack/Create React App. |
| **Tailwind CSS** | A CSS framework where you style elements by combining small utility classes (`flex`, `text-sm`, `bg-primary`) directly in the markup, instead of writing separate CSS files. |
| **Radix UI** | A library of unstyled, fully keyboard/screen-reader-accessible UI building blocks (dialogs, dropdowns, etc.) that this app styles with Tailwind. |
| **shadcn/ui** | A popular *pattern* (not a traditional npm package) for building your own UI component library on top of Radix UI + Tailwind — this project follows that pattern with hand-written components. |
| **SPA** (Single-Page Application) | A web app that loads once and then updates the page via JavaScript instead of reloading from the server on every navigation — what the React frontend is. |
| **Code splitting** | Breaking the JavaScript bundle into smaller pieces that load only when needed (e.g. the Reports page's code doesn't load until you visit `/reports`). |
| **CORS** (Cross-Origin Resource Sharing) | A browser security rule that blocks a webpage from calling an API on a different origin (domain+port) unless that API explicitly allows it — the cause of the "dashboard not loading" bug described in [§21](#21-troubleshooting-guide). |
| **CSRF** | Cross-Site Request Forgery — an attack where a malicious site tricks a logged-in user's browser into making a request to another site on their behalf; not currently a risk here since there's no session/login to hijack. |
| **XSS** | Cross-Site Scripting — an attack where malicious script gets injected into a page and runs in another user's browser; mitigated here by React's automatic escaping of rendered text. |
| **JWT** (JSON Web Token) | A common way to represent a logged-in user's identity as a signed token — not used anywhere in this app, since there's no authentication. |
| **Docker** | A tool for packaging an application and everything it needs to run into a portable "container." |
| **Multi-stage build** (Docker) | A `Dockerfile` technique that builds the app in one temporary stage (with all the dev tools) and copies only the final output into a smaller, clean production image. |
| **CI** (Continuous Integration) | Automatically running checks (like typechecking and building) every time code is pushed, to catch problems immediately — done here via GitHub Actions. |
| **Env var / `.env` file** | A configuration value (like a database password) kept outside the code, so it can differ between your laptop and the live server without editing source files. |
| **DOCX** | Microsoft Word's file format — what all the generated certificates and templates in this app are. |
| **WMAPE / win-rate / inventory simulation** | Metrics/concepts from demand-forecasting systems — **not used anywhere in this project**; included in this glossary only because the original documentation request named them (see [§8](#8-forecasting--ml-pipeline--not-applicable)). |

---

# 20. Complete Command Reference

## 20.1 Setup / installation

```bash
# Backend
cd backend
npm install
cp .env.example .env      # then fill in MONGODB_URI and Cloudinary credentials

# Frontend
cd frontend
npm install
cp .env.example .env      # VITE_API_URL=http://localhost:5000/api/v1
```

## 20.2 Running (development)

```bash
# Backend — with a real MongoDB connection
cd backend && npm run dev              # tsx watch src/server.ts → http://localhost:5000

# Backend — no MongoDB needed, disposable in-memory database
cd backend && npm run dev:local-db     # tsx dev-local.ts

# Frontend
cd frontend && npm run dev             # vite → http://localhost:5173 (or next free port)
```

## 20.3 Type checking & linting

```bash
cd backend && npm run typecheck        # tsc --noEmit
cd backend && npm run lint             # eslint "src/**/*.ts"

cd frontend && npx tsc -b              # typecheck (also runs automatically as part of `npm run build`)
cd frontend && npm run lint            # oxlint
```

## 20.4 Building for production

```bash
cd backend && npm run build            # → backend/dist/
cd backend && npm start                # node dist/server.js

cd frontend && npm run build           # tsc -b && vite build → frontend/dist/
cd frontend && npm run preview         # serve the production build locally for a smoke test
```

## 20.5 Database

```bash
# No CLI migration commands — Mongoose creates collections/indexes automatically
# on first connection to a fresh database. To inspect indexes after a deploy:
mongosh "<your MONGODB_URI>" --eval "db.students.getIndexes()"

# Verify a duplicate-USN rejection manually:
curl -X POST http://localhost:5000/api/v1/students -F "name=Test" -F "usn=1DA21CS045" -F "phone=9999999999"
```

## 20.6 Docker

```bash
docker compose up --build              # mongo + backend + frontend, all at once
# frontend → http://localhost:8080, backend → http://localhost:5000, mongo → localhost:27017

# Standalone images
cd backend && docker build -t sports-staff-backend .
docker run -p 5000:5000 --env-file .env sports-staff-backend

cd frontend && docker build -t sports-staff-frontend --build-arg VITE_API_URL=https://your-api.example.com/api/v1 .
docker run -p 8080:80 sports-staff-frontend
```

## 20.7 Health / smoke checks

```bash
curl http://localhost:5000/health                        # {"status":"ok",...}
curl http://localhost:5000/api/v1/dashboard               # {"success":true,"data":{...}}
curl "http://localhost:5000/api/v1/students?limit=5"      # first 5 students
```

## 20.8 Git

```bash
git status --short
git log --oneline -20
git diff
# (Standard commands — this project follows no unusual git workflow.
#  See root .gitignore for what's intentionally excluded from version control.)
```

## 20.9 Deployment

```bash
# Render (backend) and Vercel (frontend) both deploy automatically on `git push`
# to the branch configured in each platform's dashboard — no manual deploy command.
# Render Blueprint reads backend/render.yaml directly.
# Vercel reads frontend/vercel.json directly.
```

## 20.10 "Training / forecasting / simulation" commands
**Not applicable** — this project has no training, forecasting, or simulation scripts. See [§8](#8-forecasting--ml-pipeline--not-applicable).

---

# 21. Troubleshooting Guide

| Symptom | Root cause | Fix | Prevention |
|---|---|---|---|
| Dashboard/Students pages show an error state or never finish loading in the browser, but `curl http://localhost:5000/...` works fine | **CORS mismatch** — the frontend's actual origin (e.g. Vite fell back to port 5174) isn't in the backend's allowed origins list. This is a *real, previously-hit* bug in this exact project. | Confirm the frontend's actual dev port in its terminal output, and confirm `CORS_ORIGINS` (or, in dev, the automatic localhost-pattern match in `app.ts`) covers it. Restart the backend after changing `CORS_ORIGINS`. | The dev-mode CORS check in `app.ts` now auto-allows any `localhost`/`127.0.0.1` port specifically to prevent this recurring. |
| Backend logs show `error: Unhandled error {"err":{}}` with no useful detail | **Fixed bug, but worth knowing**: `JSON.stringify(new Error(...))` produces `{}` because `Error.message`/`.stack` are non-enumerable — logging `{ err }` directly hides the real cause. | Already fixed in `errorHandler.ts` (extracts `.message`/`.stack` explicitly before logging, and now includes the request method+path in the log line). If you see the old `{}` pattern again, check that this fix wasn't reverted. | Never `logger.error('msg', { err })` with a raw `Error` object — always extract `.message`/`.stack` first, or use a logging library's built-in error-serializing option. |
| `EADDRINUSE: address already in use :::5000` when starting the backend | Another process (possibly a previous run of this same backend that didn't shut down cleanly) is already bound to port 5000. | Find and stop the process holding the port, then retry. On Windows PowerShell: `Get-NetTCPConnection -LocalPort 5000 \| Stop-Process -Id {$_.OwningProcess} -Force`. Sometimes the port needs a moment to release after killing the process — retry once if the very next attempt still fails. | Always let `npm run dev` exit cleanly (Ctrl+C) rather than killing the terminal window outright. |
| `Vite`'s dev server reports "Port 5173 is in use, trying another one..." | Another process on the machine already has 5173. Vite automatically picks the next free port (5174, 5175, ...) and prints the real URL — this is not an error. | Use the URL Vite actually prints, and make sure the backend's CORS config allows it (see the first row of this table). | N/A — expected Vite behavior. |
| `POST /students` (or `/templates`) with a photo/file returns `500: "Cloudinary storage is not configured on this server"` | `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` aren't set (or are empty) in `backend/.env`. | Fill in all three Cloudinary variables and restart the backend. Creating students/templates *without* a file still works even with Cloudinary unconfigured — only the file-upload path needs it. | This is intentional, clean failure behavior (`isStorageConfigured()` check), not a crash — verified during development. |
| `POST /students` returns `409 "USN already exists"` unexpectedly | The USN already exists in the database, possibly under different casing you didn't notice — USNs are stored uppercase. | Search for the USN (case-insensitively, since it's normalized on write) before assuming it's free. | USN uniqueness and uppercasing are enforced identically on every write path — this is working as designed. |
| Uploading a `.docx` template fails with `400 "Invalid or corrupted .docx template"` | The uploaded file either isn't a real `.docx` (e.g. it's a renamed `.doc` or a plain-text file with a `.docx` extension), or is genuinely corrupted. | Re-save/re-export the file as a real `.docx` from Word/LibreOffice and re-upload. | `uploadDocx` multer middleware already restricts by MIME type/extension before the file reaches parsing — this error means the extension was right but the *content* wasn't a valid Word ZIP/XML structure. |
| A generated report is missing a student's photo (shows "Photo Not Found" or "No Photo" instead) | Either the student has no `photoUrl` at all, or `fetchImageForDocx()` couldn't download/recognize the image at that URL (network failure, or the file's magic bytes don't match a supported type — jpg/png/gif/bmp). | Confirm the student actually has a photo uploaded (check their detail page); if they do, confirm the Cloudinary URL is reachable directly in a browser. | This is a deliberate graceful-degradation behavior (mirrors the legacy app's own `try/except` fallback to `'Photo Available'`/`'Photo Not Found'` text) — the report still generates successfully rather than failing entirely over one missing photo. |
| `npm run build` (backend) fails with a TypeScript deprecation-flag error (`TS5103: Invalid value for '--ignoreDeprecations'`) | A previously-added `"ignoreDeprecations": "6.0"` compiler option in `tsconfig.json` isn't a value the installed TypeScript version (5.7.3) recognizes — this was a *real* mistake made and reverted during development. | Remove `"ignoreDeprecations"` from `backend/tsconfig.json` entirely — it isn't needed; the actual `tsc` build has always been clean without it. | An unrelated, purely cosmetic editor/IDE diagnostic (from a *different*, newer TypeScript language-server version than the one actually installed in `node_modules`) about `moduleResolution`/`baseUrl` deprecation can safely be ignored — trust `npm run build`/`npm run typecheck` output over an editor's inline squiggly, they can disagree when two different TypeScript versions are involved. |
| `git status` suddenly shows hundreds/thousands of unexpected file changes | Almost certainly the Python virtual environment (`web_sports_app/venv/`) or `__pycache__/` directories getting regenerated and re-tracked — these were previously committed by mistake (1,010+ files) and have since been removed with a root `.gitignore` added specifically to prevent recurrence. | Confirm `.gitignore` at the repo root still contains `venv/`, `.venv/`, `__pycache__/`, `*.pyc`; if a `venv/` was regenerated locally, it should already be ignored, not tracked. | Never activate/recreate `web_sports_app/venv/` inside the repo without confirming `.gitignore` covers it first. |
| CSV import reports fewer `imported` than expected, with entries in `skipped[]` | Some rows failed validation (missing name/USN/phone, wrong USN length, wrong phone format) or had a USN already in the database. | Read the `reason` field for each skipped row (returned directly in the API response and surfaced in a toast on the frontend), fix those specific rows in the source CSV, and re-import just those. | This is intended behavior, not a bug — see [§9](#9-business-logic), "A CSV import never aborts on one bad row." |

---

# 22. Appendix

## 22.1 Important file locations

| What | Where |
|---|---|
| Backend entry point | `backend/src/server.ts` |
| Express app configuration | `backend/src/app.ts` |
| All API routes | `backend/src/routes/*.routes.ts` |
| All business logic | `backend/src/services/*.service.ts` |
| DOCX generation logic | `backend/src/services/docx/*.docx.ts` |
| Database schemas | `backend/src/models/*.model.ts` |
| Request validation rules | `backend/src/validators/*.validator.ts` |
| Central error handling | `backend/src/middleware/errorHandler.ts` |
| Frontend entry point | `frontend/src/main.tsx` |
| Frontend routing | `frontend/src/App.tsx` |
| All API calls (frontend) | `frontend/src/api/*.api.ts` |
| All data-fetching hooks | `frontend/src/hooks/use-*.ts` |
| Design tokens / theme | `frontend/src/index.css` |
| UI component library | `frontend/src/components/ui/` |
| Legacy reference app | `web_sports_app/app.py` |
| Migration bug list | `docs/MIGRATION_REPORT.md` |

## 22.2 Configuration reference

| File | Purpose |
|---|---|
| `backend/tsconfig.json` | Backend TypeScript compiler config |
| `backend/.env` (not committed) | Backend runtime secrets/config |
| `frontend/vite.config.ts` | Frontend build/dev-server config, `@` path alias, Tailwind plugin |
| `frontend/tsconfig.app.json` | Frontend app TypeScript config (strict mode, path aliases) |
| `frontend/.env` (not committed) | Frontend runtime config (`VITE_API_URL`) |
| `frontend/components.json` | shadcn/ui conventions reference |
| `docker-compose.yml` | Local multi-container stack definition |
| `backend/render.yaml` | Render Blueprint deployment config |
| `frontend/vercel.json` | Vercel deployment config |
| `.github/workflows/ci.yml` | CI pipeline definition |

## 22.3 Environment variables reference

### Backend (`backend/.env`, see `backend/.env.example`)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `production` enables JSON logging and disables the dev-mode CORS localhost pattern-match |
| `PORT` | no | `5000` | HTTP port the API listens on |
| `MONGODB_URI` | **yes** (or use `dev:local-db`) | `mongodb://127.0.0.1:27017/sports_staff_db` | MongoDB Atlas (or local) connection string |
| `CLOUDINARY_CLOUD_NAME` | for file uploads | `''` | Cloudinary account identifier |
| `CLOUDINARY_API_KEY` | for file uploads | `''` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | for file uploads | `''` | Cloudinary API secret |
| `CORS_ORIGINS` | no | `http://localhost:5173` | Comma-separated allowed frontend origins (production trust boundary) |
| `RATE_LIMIT_WINDOW_MS` | no | `900000` (15 min) | Rate-limit window |
| `RATE_LIMIT_MAX` | no | `300` | Max requests per window per IP |

### Frontend (`frontend/.env`, see `frontend/.env.example`)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `VITE_API_URL` | **yes** | `/api/v1` (relative, if unset) | Full base URL of the backend API, e.g. `http://localhost:5000/api/v1` |

## 22.4 Useful commands (quick lookup)
See [§20](#20-complete-command-reference) for the full, categorized list.

## 22.5 Useful links within the project

- Top-level orientation: [`README.md`](README.md)
- System architecture (concise): [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Full API reference: [`docs/API.md`](docs/API.md)
- What changed from the legacy system, and every bug fixed: [`docs/MIGRATION_REPORT.md`](docs/MIGRATION_REPORT.md)
- Local setup, step by step: [`docs/INSTALLATION.md`](docs/INSTALLATION.md)
- Deployment, step by step: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- Manual test / production / deployment checklists: [`docs/CHECKLISTS.md`](docs/CHECKLISTS.md)
- Legacy implementation (reference only, not run): [`web_sports_app/app.py`](web_sports_app/app.py)
- Original hand-crafted document formats the DOCX generators were reverse-engineered from: [`REPORT FORMATS/`](REPORT%20FORMATS)

---

*End of document. This guide reflects the codebase as of the most recent commit in this working tree; if the code changes, re-derive the affected sections from the actual source rather than assuming this document stays accurate indefinitely.*
