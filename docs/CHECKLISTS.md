# Checklists

## Testing checklist

Manual pass (no automated test suite is included in this delivery):

**Students**
- [ ] Create a student with all fields filled, including a photo
- [ ] Create a student with only the required fields (name, USN, phone)
- [ ] Reject a USN that isn't exactly 10 characters
- [ ] Reject a phone number that isn't exactly 10 digits
- [ ] Reject a duplicate USN (409 Conflict)
- [ ] Edit a student, replace their photo, confirm the old Cloudinary asset
      isn't orphaned (check Cloudinary media library)
- [ ] Delete a student, confirm their photo is removed from Cloudinary
- [ ] Search by name, USN, branch, and sport (text index)
- [ ] Filter by gender and blood group
- [ ] Sort by each supported column, both directions
- [ ] Paginate past the first page
- [ ] Export CSV, re-import it into a fresh database, confirm records match
- [ ] Import a CSV with a bad row (missing name) — confirm it's reported in
      `skipped[]` and doesn't abort the whole import

**Reports**
- [ ] Generate VTU Eligibility for 1 student, for multiple, and for all
- [ ] Generate HOD Bonafide and Tournament Bonafide the same way
- [ ] Generate a custom report with each placeholder token and confirm
      substitution
- [ ] Generate a report for a student with a photo — confirm it's embedded
- [ ] Generate a report for a student without a photo — confirm graceful
      fallback text, not a crash
- [ ] Confirm each generation appears in Report History with the right
      scope/count

**Templates**
- [ ] Upload a `.docx` with `{NAME}`/`{USN}` placeholders — confirm they're
      detected and listed
- [ ] Upload a non-`.docx` file — confirm it's rejected
- [ ] Generate from a template for a specific student — confirm placeholders
      are replaced and unrelated text is untouched
- [ ] Delete a template — confirm the Cloudinary asset is removed

**Cross-cutting**
- [ ] Dashboard stats update after adding/deleting students and generating
      reports
- [ ] Dark/light theme toggle persists across reloads
- [ ] Command palette (`Ctrl/Cmd+K`) navigates to every page
- [ ] Every list page's empty state renders correctly on a fresh database
- [ ] Kill the backend and confirm the frontend shows error states, not blank
      screens or unhandled exceptions

## Production readiness checklist

- [ ] `MONGODB_URI` points at a real Atlas cluster, not `localhost`
- [ ] Atlas Network Access allows Render's egress (or `0.0.0.0/0` on the free
      tier, which has dynamic IPs)
- [ ] Cloudinary credentials set and verified (upload a real photo, don't just
      trust the env vars are non-empty)
- [ ] `CORS_ORIGINS` set to the exact production frontend origin(s) — no
      wildcards in production
- [ ] `NODE_ENV=production` on the backend (enables JSON logging, disables
      verbose dev logging)
- [ ] Rate limiting (`RATE_LIMIT_*`) tuned for expected traffic
- [ ] `helmet` and `compression` are active (verify response headers)
- [ ] Backend `/health` returns 200 and is wired into Render's health check
- [ ] Frontend built with the correct `VITE_API_URL` for the target backend
      (check the built bundle, not just the `.env` file)
- [ ] No secrets committed — `.env` files are gitignored on both `backend/`
      and `frontend/`
- [ ] MongoDB indexes exist (`usn` unique, text index) — Mongoose creates
      these automatically on first connect in a fresh database, but verify
      with `db.students.getIndexes()` after first deploy

## Deployment checklist

- [ ] MongoDB Atlas cluster created, user provisioned, IP access configured
- [ ] Cloudinary account created, credentials in hand
- [ ] Backend deployed to Render (Blueprint or manual), env vars filled in,
      `/health` returns 200
- [ ] Frontend deployed to Vercel, `VITE_API_URL` pointed at the live Render
      URL
- [ ] Backend `CORS_ORIGINS` updated to include the live Vercel URL (redeploy
      backend after changing)
- [ ] End-to-end smoke test on the live URLs: add a student, generate a
      report, upload a template, confirm dashboard reflects the activity
- [ ] CI (`.github/workflows/ci.yml`) green on `main`
- [ ] `docker compose up --build` verified locally as a fallback deployment
      path
