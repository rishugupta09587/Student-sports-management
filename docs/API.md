# API Reference

Base URL: `/api/v1` (e.g. `http://localhost:5000/api/v1` in development).

All responses are JSON with this envelope:

```json
// success
{ "success": true, "data": {}, "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 } }
// failure
{ "success": false, "error": { "message": "...", "details": {} } }
```

Report/template generation endpoints return the binary `.docx` file directly
(`Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`),
not the JSON envelope.

## Students

| Method | Path | Description |
|---|---|---|
| GET | `/students` | List students. Query: `search, branch, sport, gender, bloodGroup, semester, page, limit, sortBy(name\|usn\|branch\|sport\|createdAt), sortOrder(asc\|desc)` |
| GET | `/students/:id` | Get one student |
| POST | `/students` | Create (multipart/form-data; `photo` optional file field) |
| PUT | `/students/:id` | Update (multipart/form-data) |
| DELETE | `/students/:id` | Delete (also removes Cloudinary photo) |
| GET | `/students/export` | Download all students as CSV |
| POST | `/students/import` | Bulk import from CSV (multipart field `file`); returns `{ imported, skipped: [{row, reason}] }` |

Required fields on create/update: `name`, `usn` (exactly 10 characters, unique),
`phone` (exactly 10 digits). Everything else is optional.

## Reports

| Method | Path | Description |
|---|---|---|
| GET | `/reports/history` | Paginated report history. Query: `page, limit` |
| POST | `/reports/generate` | Body: `{ studentIds: string[], format }`. `format` ∈ `vtu_eligibility \| hod_bonafide \| tournament_bonafide \| custom` |
| POST | `/reports/generate-all` | Body: `{ format }` — generates for every student on record |
| POST | `/reports/generate-custom` | Body: `{ studentIds, title, content }` — `content` supports placeholders: `[NAME] [USN] [BRANCH] [SEMESTER] [PHONE] [EMAIL] [SPORT] [DOB] [GENDER] [MOTHER_NAME] [FATHER_NAME] [BLOOD_GROUP]` |

## Templates

| Method | Path | Description |
|---|---|---|
| GET | `/templates` | List uploaded templates |
| GET | `/templates/:id` | Get one template (includes detected `placeholders[]`) |
| POST | `/templates` | Upload (multipart: `name` field + `template` file, `.docx` only) |
| DELETE | `/templates/:id` | Delete template and its Cloudinary asset |
| POST | `/templates/:id/generate` | Body: `{ studentId }` — renders the template for one student, replacing `{PLACEHOLDER}` tags |

## Dashboard

| Method | Path | Description |
|---|---|---|
| GET | `/dashboard` | Aggregate stats: totals, byBranch, bySport, byGender, byBloodGroup, recentStudents, recentReports |

## Errors

| Status | Meaning |
|---|---|
| 400 | Validation failure (Zod) or malformed upload |
| 404 | Resource not found |
| 409 | Conflict (duplicate USN) |
| 500 | Unexpected server error, or Cloudinary not configured |

## Health check

`GET /health` — returns `{ status: "ok", uptime, timestamp }`, no `/api/v1` prefix.
Used by Docker/Render health checks.
