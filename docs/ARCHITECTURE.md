# Architecture

## Overview

A conventional two-tier SPA + REST API architecture, no auth layer:

```
┌─────────────────┐        HTTPS/JSON        ┌──────────────────┐
│  React SPA       │ ───────────────────────▶ │  Express API      │
│  (Vercel)         │ ◀─────────────────────── │  (Render)          │
└─────────────────┘                           └──────────────────┘
                                                       │      │
                                              Mongoose │      │ Cloudinary SDK
                                                       ▼      ▼
                                              ┌─────────────┐ ┌─────────────┐
                                              │ MongoDB Atlas│ │ Cloudinary  │
                                              └─────────────┘ └─────────────┘
```

## Backend

Layered, feature-oriented structure under `backend/src`:

- **`routes/`** — Express routers, one per resource (`students`, `reports`,
  `templates`, `dashboard`). Route files only wire HTTP verbs to controllers.
- **`controllers/`** — parse/validate the request (via Zod schemas in
  `validators/`), delegate to a service, shape the HTTP response via
  `utils/ApiResponse.ts`. Controllers never touch Mongoose directly.
- **`services/`** — all business logic: student CRUD rules (USN uniqueness,
  CSV import/export), report generation (`services/docx/*`), template
  placeholder extraction/rendering (`docxtemplater`), dashboard aggregation.
- **`models/`** — Mongoose schemas with validation, indexes, and timestamps.
- **`middleware/`** — `errorHandler` (maps `ApiError`/`ZodError`/Mongoose
  errors/Multer errors to consistent JSON), `upload` (multer, memory storage,
  per-file-type validation), request logging.
- **`config/`** — environment parsing (`env.ts`), MongoDB connection,
  Cloudinary client setup.

All responses follow one envelope:

```json
{ "success": true, "data": { ... }, "meta": { "page": 1, "limit": 20, "total": 42 } }
{ "success": false, "error": { "message": "...", "details": { ... } } }
```

### Document generation

Two independent code paths, both under `services/`:

1. **Fixed formats** (`services/docx/*.docx.ts`) — VTU Eligibility Proforma,
   HOD Bonafide, Tournament Bonafide, and a placeholder-based Custom report —
   built programmatically with the `docx` npm package (paragraphs, tables,
   embedded photos fetched from Cloudinary at generation time).
2. **User-uploaded templates** (`services/template.service.ts`) — arbitrary
   `.docx` files containing `{PLACEHOLDER}` tags, parsed and rendered with
   `docxtemplater`/`pizzip`. Placeholders are auto-detected on upload so the UI
   can show which tags a template supports.

Every generated report is persisted as a `Report` document (format, scope,
student IDs, generated file uploaded to Cloudinary as a `raw` resource) so a
history view is possible without regenerating files.

## Frontend

`frontend/src`, organized by concern rather than by route:

- **`api/`** — one file per resource, thin wrappers around a shared `axios`
  instance (`api/client.ts`) that normalizes errors into `ApiClientError`.
- **`hooks/`** — TanStack Query hooks per resource (`use-students.ts`,
  `use-reports.ts`, …); this is the only place components talk to the API.
- **`components/ui/`** — shadcn-style primitives built directly on Radix UI
  (button, dialog, table, select, command palette, …).
- **`components/layout/`** — app shell: sidebar, topbar, theme toggle, command
  palette (`Ctrl/Cmd+K`).
- **`components/dashboard/` / `components/shared/`** — feature-specific and
  cross-cutting UI (stat cards, charts, empty/error states, pagination,
  confirm dialogs).
- **`pages/`** — one folder per module (`dashboard`, `students`, `reports`,
  `templates`), lazy-loaded via `React.lazy` for route-level code splitting.
- **`types/`** — TypeScript types mirroring the backend's response shapes.

State is split deliberately: **server state** lives in TanStack Query (cached,
invalidated on mutation), **URL/navigation state** lives in React Router,
**ephemeral UI state** (selection, dialogs, form drafts) lives in local
component state. There is no global client-state store — the app doesn't need
one at this scale.

## Data model

```
Student
 ├─ name, usn (unique), phone            required
 ├─ dob, gender, semester, branch,
 │  email, motherName, fatherName,
 │  sport, bloodGroup                     optional
 ├─ photoUrl, photoPublicId               set on photo upload
 └─ timestamps

Sport        — lookup collection of known sport names (category, isActive)
Template     — uploaded .docx templates (fileUrl, placeholders[], sizeBytes)
Report       — generated report history (format, scope, studentIds[], fileUrl)
ApplicationSettings — singleton document (college name/address, academic year)
```

Indexes: unique `usn`, a text index across `name`/`usn`/`branch`/`sport` for
search, plus single-field indexes on `branch`, `sport`, and `createdAt` for the
list/filter/sort queries the UI relies on.

## Why no auth

Per product requirement, the system is intentionally open — anyone who can
reach the deployed URL sees the dashboard immediately. If you need to restrict
access, put it behind a VPN, IP allowlist, or a reverse-proxy auth layer;
that's a deployment concern, not something baked into the app.
