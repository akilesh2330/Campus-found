# Campus Lost & Found Management System

A placement-ready campus lost-and-found platform for students, staff and administrators. It centralizes lost/found reporting, verified search, explainable matches, private ownership claims, administrator review, notifications and recovery tracking.

## Problem statement

Campus belongings—phones, ID cards, wallets, books, chargers, bags and other everyday items—are often reported through disconnected noticeboards or chats. Campus Found offers one searchable and auditable workflow that helps the finder, owner and campus staff coordinate a safe reunion without publishing personal contact details.

## Features

- **Campus landing and discovery:** responsive home page, report/search actions, live statistics, verified lost/found listings, server-side search and filters, sorting and pagination.
- **Authentication:** student registration with validation, bcrypt password hashing, JWT sessions, role-based authorization, profile editing and administrator-only routes.
- **Reports:** lost/found forms with category, description, brand, color, location, date/time, identifying features, optional image and contact preference; unique report IDs; owner edit/close controls; staff verification.
- **Smart matching:** explainable rule-based similarity across category, item name, brand, color, campus location, description/identifying details and date proximity. Matches include percentage scores and contributing factors; no external AI service is required.
- **Ownership claims:** private explanation, identifying information, optional proof image and claimant contact details; one claim per account/item; pending, under-review, approved and rejected states; request-more-information, approve and reject actions.
- **Student dashboard:** lost/found reports, active/approved claims, possible matches, notifications and recovery history.
- **Administrator console:** operations statistics, category/monthly charts, recent activity, report verification and moderation, private claim review, user search and account activation/deactivation.
- **Notifications and recovery:** persistent in-app updates, unread counts, mark-as-read, recovery dates and retained recovery history.
- **Security:** server-side validation, JWT checks on every private endpoint, bcrypt, role middleware, login rate limits, image signature/MIME/size validation, safe public item responses and centralized friendly errors.

## Technologies

React 19, JavaScript, React Router, Vite, Bootstrap 5, custom HTML5/CSS3, Express 5, Node.js 22+, MongoDB, Mongoose, bcryptjs, jsonwebtoken, Axios, Zod, Multer, Lucide and Recharts. The backend and Vite frontend use one same-origin development server to keep API calls and authentication simple.

## Architecture

```text
Browser (React + React Router)
        │ same-origin /api requests; X-Session-Token carries the JWT
        ▼
Express REST API ── auth/role/validation/upload middleware
        │ Mongoose references and indexes
        ▼
MongoDB (local MongoDB or MongoDB Atlas)
        │
        └── local item/profile uploads; claim proof is served only to its owner/admin
```

Vite serves `client/` and proxies no API separately: Express owns `/api/*`, and Vite middleware serves the SPA on port 3000. Production uses `client/dist` static files served by the same Express app plus the same `/api` handlers. Public item responses omit personal email, phone and user identifiers. Claim proof files live outside static directories and are returned only by an authenticated endpoint.

## Folder structure

```text
campusfound/
├── app.config.ts                 # Project logo metadata
├── client/
│   ├── index.html
│   ├── public/                   # Route manifest, favicon, sample images
│   └── src/
│       ├── components/           # App shell, reusable UI and toast context
│       ├── pages/                # Public, student and administrator screens
│       ├── api.js                # Axios client and JWT session header
│       ├── AuthContext.jsx       # User/role session state
│       ├── App.jsx               # Route map and protected pages
│       └── styles.css            # Responsive design system
├── server/
│   ├── auth.js                   # JWT, user serialization and role middleware
│   ├── database.js               # MongoDB connection and dev memory fallback
│   ├── matching.js               # Explainable item similarity
│   ├── models.js                 # Mongoose schemas and indexes
│   ├── routes.js                 # REST endpoints, validation and workflows
│   ├── seed-data.js              # Idempotent sample content
│   ├── server.js                 # Express/Vite entry point
│   ├── uploads.js                # Validated public/private image upload helpers
│   ├── create-admin.js           # Secure environment-driven admin bootstrap
│   └── matching.test.js          # Focused matching tests
├── .env.example
├── package.json
└── README.md
```

## Database design

| Collection | Main fields and relationships | Search/uniqueness |
|---|---|---|
| `User` | name, email, bcrypt password hash, phone, department, role, profile image, active flag | unique lowercase email; role and active indexes |
| `Item` | unique reportId, `userId` → User, type, category, description, brand, color, location, date/time, identifying features, image, status and verification status | compound type/verification/status/date index; category/location/date index; text index for searchable descriptions and identifying fields |
| `Claim` | unique claimId, `itemId` → Item, `claimantId` → User, explanation, identifying details, private proof filename/contact info, review state and admin comment | unique `(itemId, claimantId)` index prevents duplicate claims |
| `Notification` | `userId` → User, title/message/type/read state/reference | user/read/date index |
| `Recovery` | `itemId` → Item, optional `claimId` → Claim, `userId` → User, recovered date/status | item and user indexes |

New reports start in verification review. Only verified reports appear in public search. Recovered and closed items leave active listings; their records remain available in dashboard/recovery history. Closing a user report is a soft close, and deactivating a user preserves linked records.

## REST API

All endpoints are rooted at `/api`. Private requests include `X-Session-Token: <JWT>`; the server also accepts a Bearer token for direct API clients.

| Area | Endpoints |
|---|---|
| Auth/profile | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `PUT /auth/profile` |
| Public data | `GET /stats/public`, `GET /items` (query: `q`, `type`, `category`, `location`, `dateFrom`, `dateTo`, `status`, `sort`, `page`, `limit`), `GET /items/:id` |
| Reports | `GET /items/mine`, `POST /items`, `PUT /items/:id`, `DELETE /items/:id`, `GET /items/:id/matches`, `POST /items/:id/recover` |
| Claims | `GET /claims`, `POST /claims/:itemId`, `GET /claims/:id/proof` |
| Notifications/history | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `GET /recoveries`, `GET /dashboard` |
| Admin | `GET /admin/dashboard`, `GET /admin/items`, `PUT /admin/items/:id`, `DELETE /admin/items/:id`, `GET /admin/claims`, `PUT /admin/claims/:id`, `GET /admin/users`, `PATCH /admin/users/:id/status`, `DELETE /admin/users/:id` |
| Health | `GET /health` |

The `DELETE /items/:id` and `DELETE /admin/users/:id` operations are intentionally non-destructive: reports close and accounts deactivate so claims and recovery history remain intact. A final active administrator cannot be disabled or deactivated by mistake.

## Installation (VS Code)

Requirements: Node.js 22 or later and npm 10+. A running MongoDB instance or MongoDB Atlas database is recommended for persistent data.

After downloading and extracting the project folder as `campusfound`, run:

```bash
cd campusfound
code .
npm install
cp .env.example .env
```

Edit `.env` and set a local MongoDB/Atlas URI plus a fresh random `JWT_SECRET`. Example local URI:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/campus_found
JWT_SECRET=<generate-a-long-random-value>
```

Generate a development secret with Node:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`. The `dev` command starts Express and Vite together. If `MONGODB_URI` is configured, it connects to that MongoDB database. For quick local preview only, when no URI is present outside production, the server starts an ephemeral in-memory MongoDB and creates the demo data automatically. That development-only data is lost when the process exits; use a local MongoDB service or Atlas for durable records.

### Run frontend and backend separately

The integrated `npm run dev` command is the simplest option for a demo and for the hosted Preview. If you prefer two terminals, run both from the project root:

Terminal 1 — backend API and MongoDB connection:

```bash
npm run dev:server
```

Terminal 2 — React/Vite frontend (Vite proxies `/api` and `/uploads` to Express):

```bash
npm run dev:client
```

Open `http://localhost:5173` for the standalone frontend; Express listens on `http://localhost:3000`. For production-style execution, first build the React output, then start Express:

```bash
npm run build
# Set NODE_ENV=production, MONGODB_URI and JWT_SECRET in your environment
npm start
```

The app listens on `PORT` (default `3000`) and serves the compiled client plus API. Production refuses to start without `MONGODB_URI` and `JWT_SECRET`.

## Environment variables

| Variable | Purpose |
|---|---|
| `PORT` | Express listener (defaults to 3000) |
| `NODE_ENV` | Use `development` locally; production disables demo seeding and requires secrets |
| `MONGODB_URI` | Local MongoDB or Atlas connection URI |
| `JWT_SECRET` | Secret used to sign 12-hour JWTs; do not commit it |
| `CLIENT_ORIGIN` | Optional additional allowed browser origin for CORS |
| `UPLOAD_DIR` | Local item/profile/private-proof upload root (defaults to `./server/uploads`) |
| `SEED_DEMO_DATA` | Set to `false` to disable automatic development sample seeding |
| `DEMO_STUDENT_EMAIL/PASSWORD` | Optional development student-account overrides |
| `DEMO_ADMIN_EMAIL/PASSWORD` | Optional development admin-account overrides |

Use MongoDB Atlas network access and TLS settings appropriate to your environment. Keep `.env`, uploads, passwords and real secret values outside source control. Local file uploads are appropriate for a mini-project/demo; use a durable object-storage provider such as Cloudinary before a multi-instance production deployment.

## Run the backend and seed data

The `npm run dev` server automatically inserts missing sample accounts and the sample records in development. The seed is idempotent and does not overwrite existing user data. With an explicitly configured persistent MongoDB URI, you may run it manually:

```bash
npm run seed
```

The seed command connects to `MONGODB_URI`; do not run it against a production database. Sample reports include iPhone, Samsung Galaxy phone, HP laptop charger, college ID card, black wallet, scientific calculator, Bluetooth earbuds, backpack, water bottle, engineering textbook, smartwatch and USB drive with mixed statuses.

### Demo credentials (development only)

| Role | Email | Password |
|---|---|---|
| Student | `student@example.com` | `Student@123` |
| Admin | `admin@example.com` | `Admin@123` |

Passwords are hashed using bcrypt before they are stored. Demo accounts are created only when `NODE_ENV` is not `production`; change or disable them before sharing a development database.

To create a production administrator, configure `MONGODB_URI` and supply one-time `ADMIN_EMAIL` and `ADMIN_PASSWORD` values (at least 12 characters) through the environment, then run `npm run admin:create`. Optional profile values: `ADMIN_NAME`, `ADMIN_PHONE` and `ADMIN_DEPARTMENT`. The process refuses to overwrite an existing account. Clear the one-time password from the shell/environment after use.

## Build and checks

```bash
npm test       # focused rule-matching tests
npm run build  # production React bundle
```

The service provides `GET /api/health` and `GET /manus-routes.json`. The latter lists the browser routes supported by this site. API errors return concise JSON messages; application stack traces are not sent to users.

## Screenshots

No screenshots are committed yet. Run `npm run dev`, open the pages listed in `client/public/manus-routes.json`, and capture the public landing page, student dashboard, administrator dashboard, and item details page for a presentation or repository README.

## Future enhancements

- Replace local disk uploads with Cloudinary or campus-approved object storage.
- Add email/SMS delivery behind an explicit campus notification provider.
- Add a campus SSO provider and institution-domain verification if the college requires it.
- Add privacy-reviewed pickup location scheduling and audit logs for every administrator action.
- Add automated integration tests against a disposable MongoDB instance and deployment health/backup procedures.
