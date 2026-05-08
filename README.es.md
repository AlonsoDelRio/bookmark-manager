# Gestor de Marcadores Personales

Aplicación web fullstack para guardar, organizar y buscar marcadores personales con extracción automática de metadata.

## Estado
🚧 En desarrollo

## Stack
- **Backend**: Python 3.12 + FastAPI
- **Base de datos**: Supabase (PostgreSQL + Auth)
- **Frontend**: React 18 + TypeScript
- **Infraestructura**: Docker + GitHub Actions

## Estructura del proyecto
```
bookmark-manager/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py       # Variables de entorno con pydantic-settings
│   │   │   └── supabase.py     # Cliente Supabase + dependencia de auth JWT
│   │   ├── routers/
│   │   │   └── metadata.py     # GET /api/metadata/preview
│   │   ├── schemas/
│   │   │   └── bookmark.py     # Schema MetadataResponse
│   │   ├── services/
│   │   │   └── metadata.py     # Fetch HTML + extracción de título
│   │   └── main.py
│   ├── tests/
│   │   ├── conftest.py
│   │   └── test_metadata.py    # 5 tests unitarios para funciones helper
│   ├── pytest.ini   
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── .dockerignore
│   ├── ruff.toml               # configuración del linting
│   └── Dockerfile
├── frontend/                   # Solo renderiza "Bookmark Manager — coming soon"
│   ├── src/
│   │   ├── App.tsx
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
│       └── ci.yml              # verify + lint backend + tests backend
├── .env.example
└── docker-compose.dev.yml
```
## Endpoints disponibles

| Método    | Ruta                         | Auth | Descripción              |
|-----------|------------------------------|------|--------------------------|
| GET       | `/health`                    | No   | Estado del servidor      |
| GET       | `/api/metadata/preview?url=` | JWT  | Extrae título de una URL |

## Desarrollo local

### Requisitos

- Docker Desktop corriendo

### Iniciar

```bash
docker compose -f docker-compose.dev.yml up --build
```

- Backend: `http://localhost:8000`
- Documentación API: `http://localhost:8000/docs`

### Correr tests

```bash
docker compose -f docker-compose.dev.yml exec backend pytest -v
```

### Variables de entorno

Copia `.env.example` a `.env` y completa las credenciales de Supabase:

```bash
cp .env.example .env
```

| Variable                    | Description                       |
|-----------------------------|-----------------------------------|
| `SUPABASE_URL`              | URL del proyecto de Supabase      |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (solo servidor)  |
| `SUPABASE_JWT_SECRET`       | Para validar JWTs de usuarios     |
| `VITE_SUPABASE_URL`         | URL del proyecto de Supabase      |
| `VITE_SUPABASE_ANON_KEY`    | Clave pública anónima de Supabase |
| `VITE_API_URL`              | URL base de la API del backend    |

## CI

GitHub Actions corre en cada pull request a `main`:

- **Verify** — verifica la estructura del repositorio
- **Backend lint** — ruff sobre `app/`
- **Backend tests** — pytest con cobertura

## Decisiones de Diseño

### Seguridad de Datos (RLS)
Cada usuario solo puede ver y modificar sus propios marcadores. Esto está resuelto a nivel de base de datos usando Row Level Security (RLS) de Supabase, no solo en el código de la aplicación. Esto asegura que, aunque existiera una falla lógica en el código del backend, las políticas de la base de datos por sí solas impedirán que un usuario acceda o modifique información de otros.

### Resiliencia al Guardar Marcadores
Si la página no responde, responde con un error, o no se puede extraer el título, el marcador se guarda de todas formas con un título de fallback (por ejemplo, el dominio). No se bloquea la creación por una falla de red externa. La extracción de metadatos se intenta al guardar la URL, pero las fallas externas no bloquean la acción principal.

### Comunicación con Supabase (Backend en FastAPI + SDK)
Se utiliza un backend en FastAPI implementando el SDK de Supabase para Python, en lugar de conectar directamente desde el frontend o realizar peticiones HTTP manuales. Esto centraliza la lógica de negocio, proveyendo un entorno seguro para tareas que no se pueden hacer en el navegador por temas de CORS, como el scraping de metadatos. El uso del SDK oficial abstrae la complejidad de crear consultas a la API REST.