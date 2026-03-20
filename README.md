# PassportEase – Passport Application Portal

A redesigned passport application web experience built for the Anshumat Foundation assignment.

---

## Tech Stack

| Layer    | Technology          | Why                                        |
|----------|---------------------|--------------------------------------------|
| Frontend | HTML + CSS + JS     | No build tools, runs by just opening file  |
| Backend  | Node.js + Express   | Simple, fast, easy to understand           |
| Database | SQLite (sqlite3)    | Zero config, no separate server needed     |
| Auth     | JWT + bcryptjs      | Standard stateless authentication          |
| Uploads  | Multer              | Easy file handling for Express             |

---

## Project Structure

```
passport-app/
├── frontend/
│   └── index.html        ← open this in browser
├── backend/
│   ├── server.js         ← all API routes
│   ├── db.js             ← SQLite setup + demo user seed
│   ├── middleware.js      ← JWT auth middleware
│   └── package.json
└── README.md
```

---

## How to Run

### Requirements
- Node.js v18 or above
- npm

### Step 1 — Install dependencies

```bash
cd backend
npm install
```

### Step 2 — Start the backend

```bash
node server.js
```

You should see:
```
  PassportEase Backend
  Running on http://localhost:5347

  Demo login:
  Email    : hire-me@anshumat.org
  Password : HireMe@2025!
```

### Step 3 — Open the frontend

Open `frontend/index.html` directly in your browser.
No build step needed — just open the file.

> Keep the terminal running while using the app.

---

## Demo Login

| Field    | Value                  |
|----------|------------------------|
| Email    | hire-me@anshumat.org   |
| Password | HireMe@2025!           |

This user is seeded automatically when the backend starts.
The demo account already has a submitted application visible on the dashboard.

---

## API Endpoints

| Method | Endpoint                        | Auth | Description                      |
|--------|---------------------------------|------|----------------------------------|
| POST   | /api/auth/signup                | No   | Register new user                |
| POST   | /api/auth/login                 | No   | Login, returns JWT token         |
| GET    | /api/applications               | Yes  | Get all applications for user    |
| POST   | /api/applications               | Yes  | Create new draft application     |
| GET    | /api/applications/:id           | Yes  | Get single application           |
| PUT    | /api/applications/:id           | Yes  | Save/update any step (auto-save) |
| POST   | /api/applications/:id/submit    | Yes  | Final submit, generates ref no.  |
| GET    | /api/applications/:id/receipt   | Yes  | Get receipt data                 |
| POST   | /api/documents/:id/upload       | Yes  | Upload a document (max 2MB)      |
| GET    | /api/health                     | No   | Health check                     |

---

## Features

- 5-step form with progress bar
- Auto-save every 30 seconds with timestamp
- Document upload with replace support
- Appointment date + time slot booking
- Application status tracking on dashboard
- Download receipt as text file
- Demo user seeded on first run

---

## Design Decisions

**Why single HTML file?**
Keeps it simple — no webpack, no npm for frontend. Evaluator just opens the file.

**Why SQLite?**
Zero setup. No database installation needed. The `.db` file is auto-created.

**Why step-by-step form?**
The original passport form is overwhelming. Breaking into 5 steps reduces confusion and drop-offs.

---

Submitted for: Passport Application Experience Redesign
Organization: Anshumat Foundation
