# Personal Bookmark Manager

A full-stack personal bookmark manager with metadata extraction, tag organization, and filtered search. Built with FastAPI, React, and Supabase.

## Table of Contents
- [Stack](#stack)
- [Quick Start](#quick-start)
- [Supabase Setup](#supabase-setup)
- [Running Locally](#running-locally)
- [Architecture & Design Decisions](#architecture--design-decisions)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Running Tests](#running-tests)
- [CI/CD](#cicd)
- [Deploy to Railway](#deploy-to-railway)
- [AI Usage](#ai-usage)
- [Trade-offs and TODO](#trade-offs-and-todo)


## Stack

**Backend**
- Python 3.12 + FastAPI
- Supabase (PostgreSQL + Auth)
- httpx + BeautifulSoup4 for metadata extraction
- PyJWT for token validation
- Pydantic v2 for validation
- pytest + pytest-asyncio for tests
- Ruff for linting

**Frontend**
- React 18 + TypeScript (strict mode)
- TanStack Query v5 (React Query)
- Supabase JS SDK (auth only)
- CSS Modules for styling
- Vite + pnpm

**Infrastructure**
- Docker + Docker Compose
- GitHub Actions CI
- Railway (deploy target)

---

## Quick Start

```bash
# 1. Clone and copy env
git clone https://github.com/AlonsoDelRio/bookmark-manager.git
cd bookmark-manager
cp .env.example .env   # Fill in your Supabase credentials (See the .env.example file for more details)

# 2. Apply DB schema in Supabase SQL Editor
# → paste contents of supabase/schema.sql

# 3. Run with Docker (production build)
docker compose up --build

# App: http://localhost:80
# API: http://localhost:8000
# Docs: http://localhost:8000/docs
```

For development with hot reload:

```bash
docker compose -f docker-compose.dev.yml up
# Frontend: http://localhost:5173
# Backend:  http://localhost:8000
# Docs: http://localhost:8000/docs
```

---

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **Settings → API** and copy:
   - Project URL → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon` public key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`
4. Go to **Settings → API → JWT Settings** and copy the JWT Secret → `SUPABASE_JWT_SECRET`

> **Auth settings**: By default Supabase requires email confirmation. For testing, go to **Authentication → Providers → Email** and disable "Confirm email".

---

## Running Locally

### Option A: Docker (recommended)

```bash
# Production build
docker compose up --build

# Dev with hot reload
docker compose -f docker-compose.dev.yml up
```

### Option B: Manual

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
pnpm install
pnpm dev
```

---

## Architecture & Design Decisions

###  RLS as the security foundation

Row Level Security is enabled on the `bookmarks` table with four policies (SELECT, INSERT, UPDATE, DELETE). These policies use `auth.uid()` — Supabase's built-in function that reads the JWT — to ensure users can only access their own rows.

The FastAPI backend **also** filters by `user_id` in every query. This is defense in depth: even if a bug in application code passes the wrong user_id, the database will reject it.

### Resilience on Bookmark Creation

If the external URL is unreachable, times out, or returns non-HTML content, the bookmark is saved anyway with a fallback title. The creation is not blocked due to an external network failure. Metadata extraction is attempted when saving the URL, but external failures do not block the primary save action.

### Frontend ↔ Supabase vs. Frontend ↔ FastAPI

**Rule of thumb used**: FastAPI handles everything that requires server-side logic or secrets. Supabase is used directly from the frontend only for **authentication**.

| Operation | Path | Why |
|-----------|------|-----|
| Sign in / Sign up / Sign out | Frontend → Supabase Auth SDK | Auth is Supabase's core feature; no value in proxying through FastAPI |
| Session management (JWT) | Frontend stores Supabase session | Standard pattern; token sent as Bearer to FastAPI |
| Metadata extraction | Frontend → FastAPI → External URL | Frontend must never fetch arbitrary URLs (SSRF surface, CORS restrictions) |
| CRUD bookmarks | Frontend → FastAPI → Supabase | Allows server-side validation, tag normalization, business logic |
| List/filter/search | Frontend → FastAPI → Supabase | Server-side filtering is more efficient; avoids leaking service role key |

This approach keeps the service role key exclusively on the backend. The frontend only ever holds the anon key (safe to expose) and the user's JWT.

### Frontend Architecture & Authentication

I established a robust frontend architecture using React, Vite, and strict TypeScript. Authentication is handled client-side via a Supabase singleton client, with state managed by a `useAuth` context that synchronizes sessions across browser tabs. I configured an API base client that automatically injects JWTs into requests for secure communication with the FastAPI backend. Additionally, I integrated React Query for efficient data fetching and cache management, ensuring a scalable foundation for upcoming features.

### Optimistic UI Updates

The read/unread toggle uses React Query's `onMutate` + `onError` rollback pattern. The UI updates instantly on click; if the server call fails, the previous state is restored from the snapshot. This makes the toggle feel native even on slow connections.

### Pagination: cursor vs. offset

I chose **offset-based pagination** (page/page_size) rather than infinite scroll. Rationale:
- The use case is a personal collection — users often want to jump to page 3 to find something they saved last week. Infinite scroll makes this impossible.
- Offset is simpler to implement correctly with React Query's `keepPreviousData` (smooth page transitions, no layout shift).
- Infinite scroll would have been a better fit for a social/discovery feed. For a personal archive, pagination wins.

---

## Project Structure

```
bookmark-manager/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py       # Environment settings via pydantic-settings
│   │   │   └── supabase.py     # Supabase client + JWT auth dependency
│   │   ├── routers/
│   │   │   ├── bookmarks.py     # CRUD endpoints
│   │   │   ├── tags.py          # Tag listing
│   │   │   └── metadata.py      # Preview endpoint
│   │   ├── schemas/
│   │   │   └── bookmark.py     # MetadataResponse schema
│   │   ├── services/
│   │   │   ├── bookmark.py      # DB operations
│   │   │   └── metadata.py      # HTTP + HTML parsing
│   │   └── main.py
│   ├── tests/
│   │   ├── conftest.py
│   │   └── test_metadata.py    # 15 tests covering all paths
│   ├── pytest.ini              
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── .dockerignore
│   ├── ruff.toml               # lint config
│   └── Dockerfile
│
├── frontend/                   # React app
│   ├── src/
│   │   ├── components/
│   │   │   ├── bookmarks/       # BookmarkCard, Modals, FilterBar, TagInput
│   │   │   └── layout/          # Sidebar, Header
│   │   ├── hooks/
│   │   │   ├── useAuth.tsx      # Auth context + hook
│   │   │   └── useBookmarks.ts  # React Query mutations/queries
│   │   ├── lib/
│   │   │   ├── api.ts           # FastAPI client
│   │   │   └── supabase.ts      # Supabase client
│   │   ├── pages/
│   │   │   ├── AuthPage.tsx
│   │   │   └── DashboardPage.tsx
│   │   ├── types/index.ts       # Shared TypeScript types
│   │   ├── App.tsx              # Auth routing and providers
│   │   └── main.tsx
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── eslint.config.js
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
│
├── supabase/
│   └── schema.sql               # Full schema + RLS policies
│
├── .github/
│   └── workflows/
│       └── ci.yml              # verify + backend lint + backend tests + docker compose smoke test
│
├── .env.example                # environment variables example
├── docker-compose.dev.yml      # Development (hot reload)
├── docker-compose.yml          # Production
└── README.md
```

### Environment variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

| Variable | Service | Description |
|----------|---------|-------------|
| `SUPABASE_URL` | Backend | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Full-access key (never expose to frontend) |
| `SUPABASE_JWT_SECRET` | Backend | For validating user JWTs |
| `CORS_ORIGINS` | Backend | JSON array of allowed frontend origins |
| `VITE_SUPABASE_URL` | Frontend | Same as SUPABASE_URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Public anon key |
| `VITE_API_URL` | Frontend | FastAPI base URL (empty = use Vite proxy) |

## Running Tests

```bash
docker compose -f docker-compose.dev.yml exec backend pytest -v
```
The test suite covers:

| Test | Description |
|------|-------------|
| `test_extract_domain_simple` | Domain extraction from full URLs |
| `test_extract_domain_invalid_url` | Graceful fallback for malformed URLs |
| `test_clean_title_*` | Whitespace normalization |
| `test_extract_favicon_from_link_tag` | Favicon from `<link rel="icon">` |
| `test_extract_favicon_fallback` | `/favicon.ico` fallback |
| `test_fetch_metadata_success` | Full extraction happy path |
| `test_fetch_metadata_uses_og_title` | Open Graph title fallback |
| `test_fetch_metadata_http_error_falls_back` | 404 → domain fallback |
| `test_fetch_metadata_timeout_falls_back` | Timeout → domain fallback |
| `test_fetch_metadata_connection_error` | Network error → graceful |
| `test_fetch_metadata_non_html_content` | PDF/binary → graceful |
| `test_fetch_metadata_no_title_falls_back` | No `<title>` → domain |


## CI/CD

GitHub Actions runs on every pull request to `main`:

- **Verify** — checks repository structure
- **Backend lint** — `ruff` lint + `pytest` with coverage
- **Frontend type-check** — `tsc --noEmit` + `eslint`
- **Docker** — smoke test that both images build successfully (runs after 2 & 3)

See `.github/workflows/ci.yml`.
---

## Deploy to Railway

### Backend

1. New project → Deploy from GitHub repo
2. Set root directory: `backend`
3. Add environment variables (from `.env.example`)
4. Railway auto-detects the Dockerfile

### Frontend

1. New service in the same project
2. Set root directory: `frontend`
3. Add `VITE_*` environment variables
4. Set `VITE_API_URL` to the backend's Railway URL

### CORS

Update `CORS_ORIGINS` in the backend service to include your frontend Railway URL:

```
CORS_ORIGINS=["https://your-frontend.up.railway.app"]
```

---

## AI Usage

### Tools used and for what

**Claude (Anthropic)** was my primary coding assistant throughout the project. I used it for generating backend services, React components, CSS Modules, CI workflow configuration, and Docker setup. The UI and its CSS are almost entirely AI-generated — I focused on reviewing the output, understanding what was produced, and making corrections where the logic or semantics were wrong.

**Gemini** served as a secondary consultant for quick questions about best practices, library-specific documentation, and drafting documentation text.

**Antigravity** (an AI-powered interface I used on top of these models) helped me identify errors during development — things like dependency conflicts, misconfigured Docker volumes, and broken CI jobs — by giving me a fast feedback loop without switching context.

### Workflow with the agent

I did not use AI as a passive autocomplete. My flow was closer to pair programming where I hold the design decisions and the agent handles implementation detail.

In practice:
1. I defined what I wanted to build and what constraints applied before writing any prompt — for example, deciding that metadata extraction must live in FastAPI and never in the frontend, or that the bookmark must always be saved regardless of whether metadata extraction succeeds.
2. I gave the agent that context explicitly in the prompt, not as an afterthought.
3. I reviewed every output before integrating it. For backend code I checked that error handling made semantic sense (correct HTTP status codes, not just catching everything as 500). For frontend I verified that TypeScript types matched what the backend actually returns.
4. When something did not work, I described the exact error and the context of what I had already tried, rather than just pasting the error and hoping for a fix.

### MCPs

I did not configure MCP servers directly. Antigravity provides contextual access to the tools I was using, which partially covers what MCP servers would offer — but I did not set up explicit integrations with Supabase, GitHub, or any other external service at the protocol level.

### Example prompt

When I needed the metadata extraction service, instead of asking "make a metadata extractor", I wrote:

> "I need an async Python service called `fetch_metadata(url, timeout)` using httpx.
> Requirements:
> (1) It must never raise an exception — always return a tuple (title, favicon_url, success, error_message).
> (2) If the page does not respond or returns a non-HTML content type, return the domain as the fallback title.
> (3) Try extracting title from `<title>`, then `og:title`, then `twitter:title` in that order.
> (4) The function must be independently testable without a real server — I will mock the HTTP client."

I wrote it this way because vague prompts produce vague code. By specifying the return contract, the fallback behavior, the extraction priority, and the testability requirement upfront, the output was directly usable. The four explicit requirements also made it easier to verify the output — I could check each one independently.

### Where the AI got it wrong and I had to correct it

This happened more often than the code suggests. A few concrete examples:

**Supabase auth in the backend.** The agent initially validated JWTs using `PyJWT` locally — decoding the token with the JWT secret without making a network call. It works, but I changed it to use `supabase.auth.get_user(token)` so that revoked tokens are rejected immediately rather than waiting for expiry. The agent then caught all exceptions with a generic `except Exception` block and returned `401 Unauthorized` for everything. I identified that this was semantically wrong — a Supabase service outage is not an authentication error, it is an infrastructure error. I corrected it by separating `AuthApiError` (which maps to 401) from generic exceptions (which map to 503).

**Docker volume mounts.** The agent configured the dev container to mount only `./backend/app:/app/app`. This meant `tests/`, `pytest.ini`, and `ruff.toml` were invisible inside the container. Running `pytest` collected zero items with no useful error message. I identified the problem by listing files inside the container and traced it back to the volume configuration. The fix was changing the mount to `./backend:/app`.

**CI with act locally.** The agent generated a workflow that worked fine on GitHub but failed locally with `act` due to missing authentication for cloning GitHub Actions. It did not mention this limitation. I had to research the issue, generate a personal access token with minimal scopes, and configure `.actrc` to pass it — none of which was suggested in the original output.

**Dependency conflicts.** The agent specified `httpx==0.28.0` in `requirements.txt` while also requiring `supabase==2.10.0`, which depends on `httpx>=0.26,<0.28`. This caused a `ResolutionImpossible` error on pip install. The agent did not catch this because it generated both lines independently without checking cross-dependency compatibility. I resolved it by pinning `httpx>=0.26,<0.28`.

---

## Trade-offs and TODO

**Authentication is minimal by design.** The current implementation uses Supabase Auth with email and password, no email confirmation required, and no password strength enforcement. This was a deliberate choice to keep the setup fast during development. Given more time, I would add email confirmation, a proper password reset flow, and stronger validation on the signup form.

**Search uses `ilike` instead of full-text search.** Filtering by title and URL uses Postgres `ilike` (case-insensitive pattern matching). It works for small collections but does not rank results by relevance and becomes slower as the dataset grows. A proper implementation would use a `tsvector` index with `to_tsquery`, which Postgres supports natively. Given more time, the schema already has a GIN index placeholder that would support this migration.

**Tags have no dedicated table.** Tags are stored as a `text[]` array column on the bookmarks table. This is simple and works well at this scale, but it makes operations like renaming a tag across all bookmarks or showing a tag usage count more expensive than they would be with a normalized tags table and a join table.

**No pagination on the tags sidebar.** If a user has hundreds of tags, the sidebar renders all of them at once. A search or virtual scroll on the tag list would be needed for large collections.

**Other things I would add with more time:**
- Supabase Realtime for live sync across devices
- NETSCAPE bookmark file import (`.html` — the standard export format from all browsers)
- Browser extension for one-click saving from any tab
- Frontend tests with Vitest and React Testing Library
- Improved search with relevance ranking using `tsvector`