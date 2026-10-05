# Campus Lost & Found — Implementation Plan

## Outcome

Build a placement-ready, full-stack campus lost-and-found management system for students and administrators. Students can register, report lost/found items, find verified campus reports, receive explainable candidate matches, submit private ownership claims, track reports/claims and mark successful recoveries. Administrators can verify reports, adjudicate claims, manage accounts and review operational metrics. Personal contact details and claim proof must not be published on public report pages.

## Design direction

Use the requested **purple + blue + white** visual direction: a calm, polished campus-services brand; accessible contrast; restrained violet/indigo and blue accents; consistent spacing and typography; responsive cards, tables, dashboard widgets, accessible forms, dialogs, toasts, loading feedback, empty states and errors. Maintain the project-specific Campus Found tag/finder identity in the header and favicon. Use Bootstrap 5 as the CSS framework foundation, with a tailored project design system in `client/src/styles.css`. Bundle factual example item photos only as demo content; real user reports use optional uploads.

## Architecture and data flow

- **Client:** React 19 + React Router, JavaScript, Vite and Axios. Public, student and administrator page modules load with route-level lazy imports so the landing route does not download the charts. The frontend sends relative `/api` requests and carries JWT sessions in the `X-Session-Token` header, compatible with the Cloud Preview proxy.
- **Server:** Node.js 22+ and Express 5 provide registration/login/profile endpoints, role-guarded admin APIs, report/search/match workflows, private claims, notifications and recovery records. Zod validates inputs, bcryptjs hashes passwords, jsonwebtoken issues sessions, Multer validates/stores uploads, and express-rate-limit throttles authentication.
- **Persistence:** Mongoose models and indexes store users, items, claims, notifications and recovery events in MongoDB. `MONGODB_URI` selects a durable MongoDB instance. Only local non-production demonstration may fall back to an ephemeral MongoDB Memory Server; production requires an explicitly configured MongoDB URI and `JWT_SECRET`. Never assume the platform-managed SQL database is compatible with the requested MongoDB stack.
- **Matching:** a rule-based, deterministic scoring function compares category, text/name, brand, color, location, description/identifying details and date proximity, returns a percentage with contributing factors, and works without an external AI credential. Public found reports are considered after verification.
- **Authorization and privacy:** public listings include verified non-recovered/non-closed item data only; public JSON omits reporter identity. A reporter or administrator may view their own pending detail. Claims and proof files require ownership/admin authorization. Claims and notifications are persisted; report/user removal is soft so audit and recovery history survive.

## Serving, routes and caching

- **Development Preview:** the integrated `npm run dev` process listens on the bound Cloud Preview port `3000` and uses Vite middleware plus Express APIs on the same origin. For local VS Code use, `npm run dev:server` listens on `3000` and `npm run dev:client` starts Vite on `5173`, proxying relative `/api` and `/uploads` requests to Express.
- **Production application shape:** Vite builds the SPA to `client/dist`; `npm run start` serves that build and the Express API from the same application server. The SPA catch-all is after API/static paths. The required health handler is `GET /api/health`. Public versioned Vite assets receive long-lived immutable caching; production HTML is `no-cache`; all API responses and private claim proof responses are `private, no-store`. Demo/user uploads have unique filenames and a short cache lifetime. Public SPA pages are browser-rendered, not personalized server-rendered.
- **Frontend route manifest:** keep `client/public/manus-routes.json` synchronized with all React routes. Current paths are `/`, `/lost`, `/found`, `/search`, `/items/:id`, `/how-it-works`, `/about`, `/login`, `/register`, `/report/lost`, `/report/found`, `/dashboard`, `/dashboard/reports`, `/dashboard/claims`, `/dashboard/notifications`, `/profile`, `/admin`, `/admin/items`, `/admin/claims` and `/admin/users`.
- **Publication:** publishing/deployment configuration is not requested by the user and will not be enabled here. Platform publishing is disabled; provide the live Preview URL unless a later publish is explicitly requested and authorized. Keep Preview paths relative; do not emit origin URLs constructed from internal request hosts. Avoid X-Frame-Options or CSP frame ancestors that would block the cross-site Preview iframe.

## Project structure

```text
campusfound/
├── client/
│   ├── index.html, public/                 # SPA entry, PWA manifest, route manifest, brand/demo assets
│   └── src/
│       ├── components/                     # Navigation, page shell, toast notifications
│       ├── pages/                          # Public pages, student/profile pages, admin dashboards
│       ├── api.js, AuthContext.jsx, App.jsx # Axios contract, JWT/roles, lazy routes
│       └── styles.css                      # Responsive purple/blue/white design system
├── server/
│   ├── server.js, routes.js                # Express/Vite listener, REST endpoints and workflows
│   ├── database.js, models.js              # MongoDB lifecycle, Mongoose schemas/indexes
│   ├── auth.js, uploads.js                 # JWT/roles, validated public/private uploads
│   ├── matching.js, seed-data.js           # Explainable scoring, development sample dataset
│   ├── seed.js, create-admin.js            # Explicit development seed and admin bootstrap commands
│   └── matching.test.js                    # Existing deterministic matching tests
├── ideas.md                                # Approved visual design brief
├── plan.md                                 # This plan
├── app.config.ts                           # Durable logo metadata
├── package.json / package-lock.json         # Reproducible dependencies and run scripts
├── vite.config.js / vite.standalone.config.js
├── .env.example / .gitignore
└── README.md                                # Installation, database, APIs, demos and future work
```

## Constraints and verification

- Demo credentials are disclosed as `student@example.com` / `Student@123` and `admin@example.com` / `Admin@123`; they are for non-production development only. New registrations use bcrypt hashes. Production administrator setup is environment-driven.
- Real MongoDB persistence requires the user's own local MongoDB/Atlas URI; the no-URI fallback is intentionally ephemeral and cannot prove durable storage.
- Use existing Node tests, production frontend compilation, server syntax checks, the host-managed JavaScript diagnostics and HTTP/API checks against a real running development instance. Check representative parsed API responses against the client contract, role denials, verified/pending visibility, report/claim/recovery state transitions, static route delivery and route-manifest parity. Do not use screenshots or browser interaction for validation; use code and HTTP evidence. Do not publish without the user's request.
