# Personal Bookmark Manager

A full-stack web application to save, organize, and search personal bookmarks with automatic metadata extraction.

## Status
🚧 Work in progress — Authentication UI, base frontend architecture, and complete Bookmark CRUD are implemented.

## Stack
- **Backend**: Python 3.12 + FastAPI
- **Database**: Supabase (PostgreSQL + Auth)
- **Frontend**: React 18 + TypeScript + React Query
- **Infrastructure**: Docker + GitHub Actions

## Project Structure
```
bookmark-manager/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py       # Environment settings via pydantic-settings
│   │   │   └── supabase.py     # Supabase client + JWT auth dependency
│   │   ├── routers/
│   │   │   └── metadata.py     # GET /api/metadata/preview
│   │   ├── schemas/
│   │   │   └── bookmark.py     # MetadataResponse schema
│   │   ├── services/
│   │   │   └── metadata.py     # HTML fetch + title extraction
│   │   └── main.py
│   ├── tests/
│   │   ├── conftest.py
│   │   └── test_metadata.py    # 5 unit tests for helper functions
│   ├── pytest.ini              
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── .dockerignore
│   ├── ruff.toml               # lint config
│   └── Dockerfile
├── frontend/                   # React app
│   ├── src/
│   │   ├── api/                # API base client with JWT injection
│   │   ├── components/         # UI components
│   │   ├── contexts/           # useAuth context for cross-tab sync
│   │   ├── hooks/              # React Query hooks for remote state
│   │   ├── lib/                # Supabase singleton client
│   │   ├── pages/              # AuthPage (login/signup)
│   │   ├── styles/             # Design system CSS variables
│   │   ├── types/              # Shared TypeScript types
│   │   ├── App.tsx             # Auth routing and providers
│   │   └── main.tsx
│   ├── .dockerignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── .github/
│   └── workflows/
│       └── ci.yml              # verify + backend lint + backend tests
├── .env.example
└── docker-compose.dev.yml
```

## API Endpoints

| Method    | Path                         | Auth | Description            |
|-----------|------------------------------|------|------------------------|
| GET       | `/health`                    | No   | Health check           |
| GET       | `/api/metadata/preview?url=` | JWT  | Extract title from URL |

## Local Development

### Requirements

- Docker Desktop running

### Start

```bash
docker compose -f docker-compose.dev.yml up --build
```

- Backend: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

### Run tests

```bash
docker compose -f docker-compose.dev.yml exec backend pytest -v
```

### Environment variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

| Variable                        | Description                    |
|---------------------------------|--------------------------------|
| `SUPABASE_URL`                  | Supabase project URL           |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role key (server only) |
| `SUPABASE_JWT_SECRET`           | For validating user JWTs       |
| `VITE_SUPABASE_URL`             | Supabase project URL (frontend)|
| `VITE_SUPABASE_ANON_KEY`        | Supabase anonymous public key (frontend safe)|
| `VITE_API_URL`                  | Backend API base URL           |

## CI

GitHub Actions runs on every pull request to `main`:

- **Verify** — checks repository structure
- **Backend lint** — ruff on `app/`
- **Backend tests** — pytest with coverage
- **Frontend type-check** — `tsc --noEmit` on `frontend/`
- **Frontend lint** — `eslint` on `frontend/`

## Design Decisions

### Data Security (RLS)
Each user can only see and modify their own bookmarks. This is resolved at the database level using Supabase Row Level Security (RLS), not just in the application code. This guarantees that even if there were a logic flaw in the backend application code, the database policies themselves will strictly prevent any user from accessing or modifying another user's data.

### Resilience on Bookmark Creation
If the page does not respond, returns an error, or the title cannot be extracted, the bookmark is saved anyway with a fallback title (e.g., the URL domain). The creation is not blocked due to an external network failure. Metadata extraction is attempted when saving the URL, but external failures do not block the primary save action.

### Communication with Supabase (FastAPI Backend + SDK)
A FastAPI backend utilizing the Supabase Python SDK is used rather than connecting directly from the frontend or making manual HTTP requests. This centralizes business logic, providing a secure backend environment to perform tasks restricted in the browser due to CORS, such as scraping metadata. Using the official Supabase SDK also abstracts away the complexity of raw REST API calls.

### Frontend Architecture & Authentication
I established a robust frontend architecture using React, Vite, and strict TypeScript. Authentication is handled client-side via a Supabase singleton client, with state managed by a `useAuth` context that synchronizes sessions across browser tabs. I configured an API base client that automatically injects JWTs into requests for secure communication with the FastAPI backend. Additionally, I integrated React Query for efficient data fetching and cache management, ensuring a scalable foundation for upcoming features.

### Optimistic UI Updates
For actions that require immediate user feedback, such as toggling a bookmark's read status, I implemented optimistic updates using React Query. This approach updates the UI instantly, assuming the server request will succeed, and automatically rolls back if an error occurs. This significantly improves the perceived performance and responsiveness of the application.