# AI-Powered Sustainability Insights Dashboard

A full-stack prototype that turns supplier sustainability data (emissions, energy, water, recycled content, waste recovery, certifications) into plain-English insights for business users, using **Google Gemini** through a secured backend API.

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Recharts |
| Backend | Node.js · Express 5 · TypeScript · Zod · Helmet · express-rate-limit |
| Database | PostgreSQL · Prisma ORM (migrations + seed) |
| LLM | Google Gemini (`@google/genai`, JSON-schema structured output) |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the architecture diagram (Mermaid).

## Screenshots

**Dashboard**: KPIs, emissions trend, review status, emissions by supplier and sector, and the supplier table.

![Dashboard](docs/screenshots/dashboard.png)

**Supplier detail**: metrics compared with the previous quarter, review-policy flags, and an insight generated live by Gemini (`gemini-2.5-flash`).

![Supplier detail with AI insight](docs/screenshots/supplier-insight.png)

## Features

- **Dashboard**: total suppliers, total products, total emissions (with change against the previous quarter) and suppliers requiring review. Charts show the emissions trend, review-status breakdown, emissions by supplier (click a bar to open that supplier) and emissions by sector. A supplier table can be searched and filtered.
- **Supplier details**: the supplier profile; current metrics against the previous quarter; review-policy flags; four quarters of history charts; certifications (valid or expired); and products.
- **AI insight panel**: generates a structured insight containing a summary, risk level, review flag, key findings and recommended actions. Results are cached, and the panel has regenerate, loading and error states.
- **Mock mode**: with no API key, the app still runs end to end using a template-based insight provider, and is clearly labelled as mock.

## Project structure

```
Prototype/
├── client/                 Next.js frontend
│   └── src/
│       ├── app/            pages: dashboard (/), supplier detail (/suppliers/[id])
│       ├── components/     charts, insight panel, table, badges
│       └── lib/            API client, types, formatters
├── server/                 Express API
│   ├── prisma/
│   │   ├── schema.prisma   data model
│   │   ├── migrations/     SQL migrations
│   │   ├── data/suppliers.json   ← sample dataset (15 suppliers × 4 quarters)
│   │   └── seed.ts
│   └── src/
│       ├── config/env.ts   validated environment config (secrets live here only)
│       ├── routes/         dashboard + suppliers endpoints
│       ├── middleware/     validation + central error handler
│       └── services/
│           ├── reviewRules.ts          deterministic "requires review" policy
│           ├── supplierService.ts      supplier queries and derived metrics
│           ├── dashboardService.ts     KPIs and chart aggregates
│           └── insights/               LLM pipeline (context → prompt → provider → validation → cache)
├── docs/
│   ├── ARCHITECTURE.md     architecture diagram and request flow
│   └── TECHNICAL_NOTES.md  LLM choice, prompt approach, API flow, decisions, limitations
└── docker-compose.yml      optional PostgreSQL
```

## Setup

### Prerequisites

- Node.js 20+ (built and tested on Node 24)
- PostgreSQL 14+, either a local install or Docker (see below)
- A free Gemini API key from https://aistudio.google.com/apikey (optional; without one the app runs in mock mode)

### 1. Database

**Option A: local PostgreSQL.** Create an empty database:

```bash
psql -U postgres -c "CREATE DATABASE sustainability_db;"
```

**Option B: Docker.** This starts PostgreSQL on port **5433**:

```bash
docker compose up -d
```

### 2. Backend

```bash
cd server
npm install
cp .env.example .env        # Windows: copy .env.example .env
```

Edit `server/.env`:

```env
# Option A (local):  postgresql://postgres:<your-password>@localhost:5432/sustainability_db?schema=public
# Option B (Docker): postgresql://postgres:postgres@localhost:5433/sustainability_db?schema=public
DATABASE_URL="..."
GEMINI_API_KEY="your-key"   # leave empty for mock mode
```

Then create the tables, load the sample data and start the API:

```bash
npm run db:setup            # prisma migrate deploy + seed
npm run dev                 # http://localhost:4000
```

Check it's running: `curl http://localhost:4000/api/health` should return `"database":"up"` and show which LLM provider is active.

### 3. Frontend

```bash
cd client
npm install
npm run dev                 # http://localhost:3000
```

The frontend proxies `/api/*` to the backend (`client/next.config.ts`). If the API runs somewhere else, set `API_URL` in `client/.env.local` (see `client/.env.example`).

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | DB status and active LLM provider/model (never the key) |
| GET | `/api/dashboard/summary` | KPIs, chart data and supplier summaries |
| GET | `/api/suppliers?search=&sector=&status=review\|watch\|ok` | Supplier list with derived metrics |
| GET | `/api/suppliers/:id` | Full supplier detail, history, review flags and latest insight |
| POST | `/api/suppliers/:id/insights` | Body `{ "forceRefresh"?: boolean }`. Returns **201** with a new insight, or **200** with a cached one (`meta.cached`) |

All errors use one shape: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }`.

| Status | Codes |
|---|---|
| 400 | `VALIDATION_ERROR`, `INVALID_JSON` |
| 404 | `NOT_FOUND` |
| 429 | `RATE_LIMITED`, `LLM_RATE_LIMITED` |
| 502 | `LLM_AUTH`, `LLM_INVALID_RESPONSE`, `LLM_UPSTREAM` |
| 503 | `DATABASE_UNAVAILABLE` |
| 504 | `LLM_TIMEOUT` |

## Useful scripts (server)

| Script | Purpose |
|---|---|
| `npm run dev` | API with hot reload |
| `npm run db:setup` | Apply migrations and seed |
| `npm run db:seed` | Reload the sample dataset. This resets IDs and clears cached insights |
| `npm run db:reset` | Drop and recreate the schema, then seed |
| `npm run build && npm start` | Production build |

## Further documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): architecture diagram and insight request sequence
- [docs/TECHNICAL_NOTES.md](docs/TECHNICAL_NOTES.md): LLM/API used, prompt approach, API flow, technical decisions, limitations and improvements
