# Facility Desk — Campus Facility Complaint Management System

**Stack: Vercel (static hosting + serverless REST API) + Supabase (managed Postgres)**

A full-stack, cloud-deployed web application that lets students and staff log,
track, and resolve facility maintenance issues (broken equipment, plumbing,
electrical faults, etc.) across a campus. Built for BACSE344 — Cloud
Infrastructure and Architecture.

## 1. The problem

Campus facility issues (a broken projector, a leaking tap, a dead network
port) are usually reported informally — a WhatsApp message to a warden, a
verbal complaint at the help desk — and get lost. There is no shared,
persistent record of what was reported, its status, or who is responsible.
Facility Desk gives every report a permanent, trackable ticket, backed by a
cloud database, so nothing gets forgotten and status is visible to everyone.

## 2. Architecture

```
Browser (SPA)  --same-origin fetch-->  Vercel Serverless Functions  --service_role-->  Supabase (Postgres)
     ^                                        ^
     |                                        |
Vercel static hosting                  GitHub push --> Vercel CI/CD (auto-deploy)
```

Frontend and backend deploy together as **one Vercel project** — no CORS
configuration, no separate hosting account, one set of environment
variables. See `docs/architecture.png` for the full diagram and
`docs/schema.png` for the Postgres table design.

| Layer | Technology | Where it runs |
|---|---|---|
| Frontend | HTML5, CSS3, vanilla JS (fetch API) | Vercel static hosting / CDN |
| Backend / REST API | Node.js serverless functions | Vercel (`/api/complaints`, `/api/health`) |
| Database | PostgreSQL | Supabase (managed, free tier) |

**Why the app's own `/api` layer, not Supabase's auto-generated REST API
directly?** Supabase auto-generates a REST endpoint for every table
(PostgREST), which would let the frontend talk to it with zero backend code.
This project deliberately does **not** do that — instead:

- Row Level Security is enabled on `complaints` with **no policies for the
  public/anon role**, so Supabase's auto-generated API is unreachable from
  the browser.
- All reads/writes go through this project's own hand-written REST endpoints
  (`/api/complaints`, `/api/complaints/:id`), which use the **service role**
  key — kept strictly server-side as a Vercel environment variable, never
  shipped to the client.

This keeps Supabase acting purely as the managed *database*, while the
RESTful API — the thing the assignment asks students to implement — is
genuinely implemented in this codebase.

## 3. Project structure

```
facility-desk/
├── api/
│   ├── complaints/
│   │   ├── index.js      # GET (list, ?status=&?category= filters) · POST (create)
│   │   └── [id].js       # GET (one) · PUT (update) · DELETE
│   └── health.js         # simple liveness check
├── lib/
│   ├── supabaseClient.js # server-side Supabase client (service role key)
│   └── mapComplaint.js   # snake_case (DB) <-> camelCase (API/JSON) mapping
├── test/
│   └── complaints.test.js # Jest tests, mocked Supabase client
├── index.html
├── style.css
├── script.js
├── schema.sql             # run once in the Supabase SQL editor
├── .env.local.example
└── package.json
```

## 4. Database design

A single Postgres table, `complaints`, created by `schema.sql`:

| Column | Type | Constraint |
|---|---|---|
| id | uuid | primary key, `gen_random_uuid()` |
| title | text | not null, 1–120 chars |
| description | text | not null, 1–1000 chars |
| category | text | enum check: Electrical / Plumbing / Furniture / IT-Network / Housekeeping / Other |
| location | text | not null |
| reported_by | text | not null |
| status | text | enum check: Open / In Progress / Resolved — default Open |
| priority | text | enum check: Low / Medium / High — default Medium |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now(), auto-refreshed by trigger on UPDATE |

Row Level Security is enabled with no public policies — see Section 2.

## 5. REST API reference

Base URL: `/api/complaints` (same origin as the frontend once deployed).

| Method | Endpoint | Description | Body |
|---|---|---|---|
| POST | `/api/complaints` | Create a new complaint | `{ title, description, category, location, reportedBy, priority }` |
| GET | `/api/complaints` | List all complaints. Optional query: `?status=Open`, `?category=Electrical` | — |
| GET | `/api/complaints/:id` | Get a single complaint by id | — |
| PUT | `/api/complaints/:id` | Update a complaint (e.g. status) | any subset of fields |
| DELETE | `/api/complaints/:id` | Delete a complaint | — |
| GET | `/api/health` | Liveness check | — |

All responses are JSON of the shape `{ success, data | message }`.

## 6. Run locally

**1. Install dependencies**
```bash
npm install
```

**2. Create a Supabase project** (see Section 7 for full steps) and run
`schema.sql` in its SQL editor.

**3. Set environment variables**
```bash
cp .env.local.example .env.local
# fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from
# Supabase → Settings → API
```

**4. Run with the Vercel CLI** (recommended — runs the static site *and*
the serverless functions together, exactly like production)
```bash
npm install -g vercel
vercel dev
```
Open the printed local URL (typically `http://localhost:3000`).

**5. Run the automated tests** (mocked Supabase client, no network required)
```bash
npm test
```

## 7. Cloud deployment guide

### Step 1 — Database: Supabase
1. Create a free account at supabase.com → **New project**. Choose a name,
   database password (save it), and region.
2. Once the project is ready, open **SQL Editor → New query**, paste the
   contents of `schema.sql`, and run it. This creates the `complaints`
   table with constraints, the auto-update trigger, and Row Level Security.
3. Go to **Settings → API**. Copy:
   - **Project URL** → this is `SUPABASE_URL`
   - **service_role** key (under "Project API keys" — *not* the `anon`
     key) → this is `SUPABASE_SERVICE_ROLE_KEY`. Keep this secret; it
     bypasses Row Level Security.

### Step 2 — Push to GitHub
```bash
git init
git add .
git commit -m "Facility Desk - Vercel + Supabase"
git remote add origin https://github.com/<your-username>/facility-desk.git
git branch -M main
git push -u origin main
```

### Step 3 — Deploy: Vercel
1. Go to vercel.com → sign up with GitHub → **Add New → Project** → import
   your `facility-desk` repository.
2. Framework preset: **Other** (static site + serverless functions,
   auto-detected from the `api/` folder — no build command needed).
3. Under **Environment Variables**, add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. **Deploy**. Vercel gives you a public URL such as
   `https://facility-desk.vercel.app`.
5. Visit `https://facility-desk.vercel.app/api/health` — you should see
   `{"message":"Facility Desk API (Vercel + Supabase) is running"}`,
   confirming the serverless functions and database are both live.

### Step 4 — Verify end-to-end
Open the deployed URL, file a ticket, refresh, edit its status, and delete
it — confirming the full CRUD cycle works against the live Supabase
database through the deployed REST API, with the frontend, API, and CI/CD
pipeline all managed from a single Vercel project.

## 8. Demonstration video — suggested outline

1. (0:00) State the problem and show the architecture diagram.
2. (0:30) Show the Supabase project — the `complaints` table (empty), and
   the RLS policy screen showing no public policies exist.
3. (1:15) Show the Vercel project dashboard: the deployment, the two
   environment variables (values hidden), and the `api/` functions listed.
4. (1:45) Open the deployed app. Create a ticket (**Create**) → show it
   appear in the list (**Read**) → edit its status (**Update**) → refresh
   Supabase's **Table Editor** to show the change persisted there → delete
   the ticket (**Delete**) → show the Supabase table is empty again.
5. (3:15) Briefly open `api/complaints/index.js` and `[id].js` to explain
   how each REST verb maps to a Supabase query, and point out the RLS +
   service-role setup that keeps the database server-only.
6. (4:00) Close with the deployed URL and repo link.

## 9. Rubric mapping

| Rubric component | Where it's addressed |
|---|---|
| Problem selection & system architecture | Section 1–2, `docs/architecture.png` |
| Application development, full CRUD | `index.html`/`script.js` (UI) + `api/complaints/*` (CRUD logic) |
| Cloud-hosted database | Supabase Postgres, Section 4, `docs/schema.png` |
| RESTful API for client-server comms | Section 5 — hand-written endpoints, not Supabase's auto-API |
| Cloud deployment & integration | Section 7 (Supabase + Vercel, single platform) |
| Documentation & demonstration | This README + Section 8 video outline |
