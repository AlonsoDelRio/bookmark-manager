# Personal Bookmark Manager

A full-stack web application to save, organize, and search personal bookmarks with automatic metadata extraction.

## Status
🚧 Work in progress

## Stack
- **Backend**: Python 3.12 + FastAPI
- **Database**: Supabase (PostgreSQL + Auth)
- **Frontend**: React 18 + TypeScript
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
├── frontend/                   # React app — auth UI coming next
│   ├── src/
│   │   ├── App.tsx             # Currently renders "Bookmark Manager — coming soon"
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