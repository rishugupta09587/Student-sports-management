# Migration Report: Flask/PostgreSQL → MERN

## Source system

`web_sports_app/` — a Flask app (`app.py`, 742 lines) with `psycopg2`
(PostgreSQL), server-rendered Jinja2/Bootstrap templates, `python-docx` for
report generation, and an optional (effectively dead) S3 upload path using
placeholder credentials. No authentication. Five duplicate/abandoned copies of
the app entrypoint (`app_backup.py`, `app_final.py`, `app_fixed.py`,
`app_new.py`, `app_updated.py`) existed alongside the live one — none of them
were imported anywhere and are not part of the migrated system.

## Route → endpoint mapping

| Flask route | New API | Notes |
|---|---|---|
| `GET /` | frontend `/` (Dashboard) | Was a static feature-card page; now a live stats dashboard |
| `GET/POST /data-entry` | `POST /api/v1/students` | Same required fields (name, USN, phone) and validation rules |
| `GET /data-view` | `GET /api/v1/students` | Now paginated, searchable, sortable (was a full unpaginated table dump) |
| `GET /data-edit` | `GET /api/v1/students` (list) + edit page | |
| `GET/POST /edit-student/<id>` | `GET/PUT /api/v1/students/:id` | |
| `POST /delete-student/<id>` | `DELETE /api/v1/students/:id` | |
| `GET/POST /data-select` | Reports page student picker + `GET /api/v1/students?search=` | |
| `GET /report` | frontend `/reports` | |
| `POST /generate-report` | `POST /api/v1/reports/generate` | |
| `POST /edit-report` + `POST /generate_edited_report` | `POST /api/v1/reports/generate-custom` | Combined into one step in the UI; same `[NAME]`/`[USN]`/`[BRANCH]` placeholder syntax, extended with more tokens |
| `POST /generate-all-report` | `POST /api/v1/reports/generate-all` | |
| `GET/POST /template-upload` | `/api/v1/templates` (CRUD) + `/templates/:id/generate` | The Flask version only *stored* the uploaded file in the session — it never actually filled it in. The new version implements real placeholder extraction and rendering (`docxtemplater`), which the legacy app never had |

## Data model changes

| Flask (`students` table) | Mongo (`Student`) | Notes |
|---|---|---|
| `id SERIAL` | `_id ObjectId` | |
| `usn VARCHAR(10) UNIQUE` | `usn` unique index | Same 10-character rule |
| `photo_path TEXT` (local filename) | `photoUrl` + `photoPublicId` | Moved from local disk / dead S3 path to Cloudinary |
| `sports TEXT` | `sport` | Singular field, unchanged meaning |
| free-text `gender`, `blood_group` | enum-validated `gender`, `bloodGroup` | Same allowed values as the original HTML `<select>` options |
| no indexes beyond `usn` | text index (`name`,`usn`,`branch`,`sport`) + indexes on `branch`, `sport`, `createdAt` | Enables the new search/filter/sort features |

New collections that didn't exist before: `Report` (generation history — the
Flask app never recorded what was generated), `Template` (now a real,
queryable entity instead of a session variable), `Sport` (lookup collection),
`ApplicationSettings` (singleton for college name/address/academic year, was
hardcoded in the DOCX generation code).

## Business logic preserved exactly

- USN must be exactly 10 characters; phone must be exactly 10 digits — same
  validation, now enforced identically on client (Zod) and server (Zod +
  Mongoose).
- All three DOCX report layouts (VTU Eligibility Proforma table structure and
  column headers, HOD Bonafide certificate wording, Tournament Bonafide letter
  + signature table) reproduce the original text and structure line-for-line.
- Custom/edited report placeholder substitution (`[NAME]`, `[USN]`,
  `[BRANCH]`) — extended with more tokens but backward-compatible.

## Bugs fixed, not carried forward

- **VTU eligibility table used the wrong column for USN.** The original
  handler read `student[6]` (the `semester` column, per the table's own
  `CREATE TABLE` order) where it clearly intended `student[7]` (`usn`) —
  visible by comparing against the adjacent `Course:`/`Branch:` lines that use
  the correct offsets. This was a plain off-by-one in raw tuple indexing; the
  new version uses named model fields (`student.usn`), which makes this whole
  category of bug impossible.
- **Dead S3 code path.** `cloud_storage.py` shipped with hardcoded example AWS
  credentials (`AKIAIOSFODNN7EXAMPLE`, AWS's own documentation placeholder,
  not a real leaked secret) and was never actually reachable in production.
  Replaced with a real, configured Cloudinary integration.
- **Template upload never filled in the template.** `/template-upload` in the
  Flask app saved the file and listed students, but no route ever read the
  uploaded template back or substituted variables into it — the feature was
  incomplete. The new `/templates/:id/generate` endpoint actually does this.
- **Five duplicate app entrypoints** (`app_backup.py`, `app_final.py`,
  `app_fixed.py`, `app_new.py`, `app_updated.py`) — dead weight, not migrated.
- **No pagination anywhere** — `/data-view` and `/data-select` loaded every
  row unconditionally; the new list endpoints default to `limit=20` (`10` on
  the reports picker) with `skip/limit` pagination and a `totalPages` in the
  response.
- Trailing blank page after the last student in the HOD Bonafide bulk report
  (an unconditional `page_break()` after every student, including the last)
  — the new version only inserts a page break *between* students.

## Known gaps / deliberate scope decisions

- Template rendering (`/templates/:id/generate`) fills in **one student per
  request** rather than batch-merging many students into one template. The
  three fixed report formats already cover the "many students, one document"
  case; templates are for one-off documents (leave letters, individual
  certificates) where per-student generation is the natural unit.
- No authentication, by explicit product requirement — matches the original
  system's behavior (Flask app also had none).
