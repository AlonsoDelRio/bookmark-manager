# Gestor de Marcadores Personal

Un gestor de marcadores personal fullstack con extracción automática de metadata, organización por etiquetas y búsqueda con filtros. Construido con FastAPI, React y Supabase.

## Tabla de contenidos
- [Stack](#stack)
- [Inicio rápido](#inicio-rápido)
- [Configuración de Supabase](#configuración-de-supabase)
- [Ejecución local](#ejecución-local)
- [Arquitectura y decisiones de diseño](#arquitectura-y-decisiones-de-diseño)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Variables de entorno](#variables-de-entorno)
- [Ejecutar tests](#ejecutar-tests)
- [CI/CD](#cicd)
- [Deploy en Railway](#deploy-en-railway)
- [Uso de IA](#uso-de-ia)
- [Trade-offs y pendientes](#trade-offs-y-pendientes)

---

## Stack

**Backend**
- Python 3.12 + FastAPI
- Supabase (PostgreSQL + Auth)
- httpx + BeautifulSoup4 para extracción de metadata
- PyJWT para validación de tokens
- Pydantic v2 para validación
- pytest + pytest-asyncio para tests
- Ruff para linting

**Frontend**
- React 18 + TypeScript (modo estricto)
- TanStack Query v5 (React Query)
- Supabase JS SDK (solo auth)
- CSS Modules para estilos
- Vite + pnpm

**Infraestructura**
- Docker + Docker Compose
- GitHub Actions CI
- Railway (deploy objetivo)

---

## Inicio rápido

```bash
# 1. Clonar y copiar variables de entorno
git clone https://github.com/AlonsoDelRio/bookmark-manager.git
cd bookmark-manager
cp .env.example .env   # Completar con las credenciales de Supabase (ver .env.example)

# 2. Ejecutar el schema en el SQL Editor de Supabase
# → pegar el contenido de supabase/schema.sql

# 3. Levantar con Docker (build de producción)
docker compose up --build

# App: http://localhost:80
# API: http://localhost:8000
# Docs: http://localhost:8000/docs
```

Para desarrollo con hot reload:

```bash
docker compose -f docker-compose.dev.yml up
# Frontend: http://localhost:5173
# Backend:  http://localhost:8000
# Docs:     http://localhost:8000/docs
```

---

## Configuración de Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar el contenido de `supabase/schema.sql`
3. Ir a **Settings → API** y copiar:
   - Project URL → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - Clave pública `anon` → `VITE_SUPABASE_ANON_KEY`
   - Clave secreta `service_role` → `SUPABASE_SERVICE_ROLE_KEY`
4. Ir a **Settings → API → JWT Settings** y copiar el JWT Secret → `SUPABASE_JWT_SECRET`

> **Configuración de Auth**: Por defecto Supabase requiere confirmación de email. Para pruebas, ir a **Authentication → Providers → Email** y desactivar "Confirm email".

---

## Ejecución local

### Opción A: Docker (recomendado)

```bash
# Build de producción
docker compose up --build

# Desarrollo con hot reload
docker compose -f docker-compose.dev.yml up
```

### Opción B: Manual

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

## Arquitectura y decisiones de diseño

### RLS como fundamento de seguridad

Row Level Security está habilitado en la tabla `bookmarks` con cuatro políticas (SELECT, INSERT, UPDATE, DELETE). Estas políticas usan `auth.uid()` — la función de Supabase que lee el JWT — para garantizar que cada usuario solo pueda acceder a sus propios registros.

El backend de FastAPI **también** filtra por `user_id` en cada consulta. Esto es defensa en profundidad: incluso si un bug en el código de la aplicación pasa un `user_id` incorrecto, la base de datos lo rechazará.

### Resiliencia en la creación de marcadores

Si la URL externa no responde, devuelve error, o el contenido no es HTML, el marcador se guarda igualmente con un título de fallback derivado del dominio. La creación nunca se bloquea por una falla de red externa. La extracción de metadata se intenta al guardar la URL, pero su resultado es informativo — el marcador siempre persiste.

### Frontend ↔ Supabase vs. Frontend ↔ FastAPI

**Regla general**: FastAPI maneja todo lo que requiere lógica del servidor o secretos. Supabase se usa directamente desde el frontend solo para **autenticación**.

| Operación | Camino | Por qué |
|-----------|--------|---------|
| Sign in / Sign up / Sign out | Frontend → Supabase Auth SDK | Auth es la función principal de Supabase; no tiene valor enrutarlo por FastAPI |
| Gestión de sesión (JWT) | Frontend almacena la sesión de Supabase | Patrón estándar; el token se envía como Bearer a FastAPI |
| Extracción de metadata | Frontend → FastAPI → URL externa | El frontend nunca debe hacer fetch a URLs arbitrarias (superficie SSRF, restricciones CORS) |
| CRUD de marcadores | Frontend → FastAPI → Supabase | Permite validación del servidor, normalización de tags, lógica de negocio |
| Listado/filtrado/búsqueda | Frontend → FastAPI → Supabase | El filtrado del servidor es más eficiente; evita exponer la service role key |

Este enfoque mantiene la service role key exclusivamente en el backend. El frontend solo maneja la anon key (segura para exponer) y el JWT del usuario.

### Arquitectura frontend y autenticación

La autenticación se maneja del lado del cliente mediante un cliente singleton de Supabase, con estado gestionado por un contexto `useAuth` que sincroniza sesiones entre pestañas del navegador. Un cliente base de API inyecta automáticamente el JWT en cada petición al backend de FastAPI. React Query maneja el estado del servidor, caché y refetch en segundo plano — manteniendo la UI consistente sin gestión manual de estado.

### Actualizaciones optimistas en la UI

El toggle de leído/no leído usa el patrón `onMutate` + `onError` de React Query. La UI se actualiza instantáneamente al hacer click; si la llamada al servidor falla, el estado anterior se restaura desde el snapshot. Esto hace que la interacción se sienta nativa incluso en conexiones lentas.

### Paginación: offset sobre scroll infinito

Elegí paginación por offset (page/page_size) en lugar de scroll infinito porque:
- Este es un archivo personal, no un feed social. Los usuarios necesitan saltar a una página específica para encontrar algo guardado semanas atrás — el scroll infinito hace eso imposible.
- `keepPreviousData` en React Query produce transiciones de página suaves sin saltos de layout.
- La paginación por offset es más fácil de razonar y testear correctamente.

---

## Estructura del proyecto

```
bookmark-manager/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py        # Variables de entorno con pydantic-settings
│   │   │   └── supabase.py      # Cliente Supabase + dependencia JWT auth
│   │   ├── routers/
│   │   │   ├── bookmarks.py     # Endpoints CRUD
│   │   │   ├── tags.py          # Listado de tags
│   │   │   └── metadata.py      # Endpoint de preview
│   │   ├── schemas/
│   │   │   └── bookmark.py      # Modelos Pydantic
│   │   ├── services/
│   │   │   ├── bookmark.py      # Operaciones de DB
│   │   │   └── metadata.py      # Fetch HTTP + parsing HTML
│   │   └── main.py
│   ├── tests/
│   │   ├── conftest.py
│   │   └── test_metadata.py     # 15 tests cubriendo todos los caminos
│   ├── pytest.ini
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── ruff.toml
│   ├── .dockerignore
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── bookmarks/       # BookmarkCard, Modals, FilterBar, TagInput
│   │   │   └── layout/          # Sidebar, Header
│   │   ├── hooks/
│   │   │   ├── useAuth.tsx      # Contexto de auth + hook
│   │   │   └── useBookmarks.ts  # Mutations/queries de React Query
│   │   ├── lib/
│   │   │   ├── api.ts           # Cliente FastAPI
│   │   │   └── supabase.ts      # Cliente Supabase
│   │   ├── pages/
│   │   │   ├── AuthPage.tsx
│   │   │   └── DashboardPage.tsx
│   │   ├── types/index.ts
│   │   ├── App.tsx
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
│   └── schema.sql               # Schema completo + políticas RLS
│
├── .github/
│   └── workflows/
│       └── ci.yml               # verify, lint+tests backend, type-check+lint frontend, smoke test docker
│
├── .env.example
├── docker-compose.dev.yml
├── docker-compose.yml
└── README.md
```

---

## Variables de entorno

Copiar `.env.example` a `.env` y completar con las credenciales de Supabase:

```bash
cp .env.example .env
```

| Variable | Servicio | Descripción |
|----------|---------|-------------|
| `SUPABASE_URL` | Backend | URL del proyecto de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Clave de acceso total (nunca exponer al frontend) |
| `SUPABASE_JWT_SECRET` | Backend | Para validar los JWTs de usuarios |
| `CORS_ORIGINS` | Backend | Array JSON de orígenes permitidos del frontend |
| `VITE_SUPABASE_URL` | Frontend | Igual que SUPABASE_URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Clave pública anon |
| `VITE_API_URL` | Frontend | URL base de FastAPI (vacío = usar proxy de Vite en dev) |

---

## Ejecutar tests

```bash
docker compose -f docker-compose.dev.yml exec backend pytest -v
```

| Test | Descripción |
|------|-------------|
| `test_extract_domain_simple` | Extracción de dominio desde URLs completas |
| `test_extract_domain_invalid_url` | Fallback gracioso para URLs mal formadas |
| `test_clean_title_*` | Normalización de espacios en blanco |
| `test_extract_favicon_from_link_tag` | Favicon desde `<link rel="icon">` |
| `test_extract_favicon_fallback` | Fallback a `/favicon.ico` |
| `test_fetch_metadata_success` | Camino feliz de extracción completa |
| `test_fetch_metadata_uses_og_title` | Fallback a título Open Graph |
| `test_fetch_metadata_http_error_falls_back` | Error 404 → fallback al dominio |
| `test_fetch_metadata_timeout_falls_back` | Timeout → fallback al dominio |
| `test_fetch_metadata_connection_error` | Error de red → gracioso |
| `test_fetch_metadata_non_html_content` | PDF/binario → gracioso |
| `test_fetch_metadata_no_title_falls_back` | Sin `<title>` → fallback al dominio |

---

## CI/CD

GitHub Actions corre en cada pull request a `main`:

- **Verify** — verifica la estructura del repositorio
- **Backend lint** — ruff sobre `app/`
- **Backend tests** — pytest con credenciales de Supabase placeholder
- **Frontend type-check** — `tsc --noEmit`
- **Frontend lint** — ESLint con reglas de TypeScript y React hooks
- **Docker smoke test** — verifica que ambas imágenes de producción construyen correctamente

Ver `.github/workflows/ci.yml`.

---

## Deploy en Railway

### Backend

1. Nuevo proyecto → Deploy desde repositorio de GitHub
2. Establecer directorio raíz: `backend`
3. Agregar variables de entorno (desde `.env.example`)
4. Railway detecta el Dockerfile automáticamente

### Frontend

1. Nuevo servicio en el mismo proyecto
2. Establecer directorio raíz: `frontend`
3. Agregar variables de entorno `VITE_*`
4. Establecer `VITE_API_URL` con la URL del backend en Railway

### CORS

Actualizar `CORS_ORIGINS` en el servicio del backend:

```
CORS_ORIGINS=["https://your-frontend.up.railway.app"]
```

---

## Uso de IA

### Herramientas usadas y para qué

**Claude (Anthropic)** fue mi asistente principal durante todo el proyecto. Lo usé para generar servicios del backend, componentes de React, CSS Modules, configuración del workflow de CI y setup de Docker. La UI y sus estilos CSS son casi enteramente generados con IA — mi enfoque estuvo en revisar el output, entender qué se estaba produciendo y hacer correcciones donde la lógica o la semántica eran incorrectas.

**Gemini** funcionó como consultor secundario para preguntas rápidas sobre buenas prácticas, documentación específica de librerías y redacción de texto.

**Antigravity** (una interfaz con IA que usé sobre estos modelos) me ayudó a identificar errores durante el desarrollo — conflictos de dependencias, volúmenes mal configurados en Docker, jobs de CI rotos — dándome un ciclo de retroalimentación rápido sin cambiar de contexto.

### Flujo de trabajo con el agente

No usé la IA como autocompletado pasivo. Mi flujo fue más cercano a programación en pareja donde yo tomo las decisiones de diseño y el agente maneja el detalle de implementación.

En la práctica:
1. Definía qué quería construir y qué restricciones aplicaban antes de escribir cualquier prompt — por ejemplo, decidir que la extracción de metadata debe vivir en FastAPI y nunca en el frontend, o que el marcador siempre debe guardarse independientemente de si la extracción de metadata falla.
2. Le daba ese contexto al agente de forma explícita en el prompt, no como algo secundario.
3. Revisaba cada output antes de integrarlo. Para el código del backend verificaba que el manejo de errores tuviera sentido semántico (códigos HTTP correctos, no simplemente capturando todo como 500). Para el frontend verificaba que los tipos TypeScript coincidieran con lo que el backend realmente devuelve.
4. Cuando algo no funcionaba, describía el error exacto y el contexto de lo que ya había intentado, en lugar de solo pegar el error esperando una solución.

### MCPs

No configuré servidores MCP directamente. Antigravity provee acceso contextual a las herramientas que estaba usando, lo que cubre parcialmente lo que los servidores MCP ofrecerían — pero no establecí integraciones explícitas con Supabase, GitHub u otro servicio externo a nivel de protocolo.

### Ejemplo de prompt concreto

Cuando necesité el servicio de extracción de metadata, en lugar de pedir "haz un extractor de metadata", escribí:

> "Necesito un servicio async en Python llamado `fetch_metadata(url, timeout)` usando httpx.
> Requisitos:
> (1) Nunca debe lanzar una excepción — siempre debe retornar una tupla (title, favicon_url, success, error_message).
> (2) Si la página no responde o devuelve un content-type que no es HTML, retornar el dominio como título fallback.
> (3) Intentar extraer el título desde `<title>`, luego `og:title`, luego `twitter:title` en ese orden.
> (4) La función debe ser testeable de forma independiente sin un servidor real — voy a mockear el cliente HTTP."

Lo formulé así porque los malos prompts generan codigo malo. Al especificar el contrato de retorno, el comportamiento de fallback, la prioridad de extracción y el requisito de testeabilidad desde el inicio, el output fue directamente usable. Los cuatro requisitos explícitos también facilitaron verificar el output — podía revisar cada uno de forma independiente.

### Donde la IA se equivocó y tuve que corregirla

Esto pasó con más frecuencia de lo que el código sugiere. Algunos ejemplos concretos:

**Auth de Supabase en el backend.** El agente inicialmente validaba los JWTs usando `PyJWT` localmente — decodificando el token con el JWT secret sin hacer una llamada de red. Funciona, pero lo cambié para usar `supabase.auth.get_user(token)` de modo que los tokens revocados se rechacen inmediatamente en lugar de esperar a que expiren. El agente luego capturaba todas las excepciones con un bloque genérico `except Exception` y retornaba `401 Unauthorized` para todo. Identifiqué que esto era semánticamente incorrecto — una interrupción del servicio de Supabase no es un error de autenticación, es un error de infraestructura. Lo corregí separando `AuthApiError` (que mapea a 401) de las excepciones genéricas (que mapean a 503).

**Montaje de volúmenes en Docker.** El agente configuró el contenedor de desarrollo para montar solo `./backend/app:/app/app`. Esto significaba que `tests/`, `pytest.ini` y `ruff.toml` eran invisibles dentro del contenedor. Al correr `pytest` recolectaba cero items sin ningún mensaje de error útil. Identifiqué el problema listando los archivos dentro del contenedor y lo rastreé hasta la configuración del volumen. La corrección fue cambiar el mount a `./backend:/app`.

**CI con act localmente.** El agente generó un workflow que funcionaba bien en GitHub pero fallaba localmente con `act` por falta de autenticación para clonar las GitHub Actions. No mencionó esta limitación. Tuve que investigar el problema, generar un personal access token con permisos mínimos y configurar `.actrc` para pasarlo — nada de esto fue sugerido en el output original.

**Conflictos de dependencias.** El agente especificó `httpx==0.28.0` en `requirements.txt` mientras que también requería `supabase==2.10.0`, que depende de `httpx>=0.26,<0.28`. Esto causó un error `ResolutionImpossible` en pip install. El agente no detectó esto porque generó ambas líneas de forma independiente sin verificar la compatibilidad entre dependencias. Lo resolví fijando `httpx>=0.26,<0.28`.

---

## Trade-offs y pendientes

**La autenticación es mínima por diseño.** La implementación actual usa Supabase Auth con email y contraseña, sin confirmación de email requerida y sin validación de fuerza de contraseña. Esta fue una decisión deliberada para mantener el setup ágil durante el desarrollo. Con más tiempo, agregaría confirmación de email, un flujo de restablecimiento de contraseña adecuado y validación más robusta en el formulario de registro.

**La búsqueda usa `ilike` en lugar de búsqueda de texto completo.** El filtrado por título y URL usa `ilike` de Postgres (coincidencia de patrones insensible a mayúsculas). Funciona para colecciones pequeñas pero no rankea los resultados por relevancia y se vuelve más lento conforme crece el dataset. Una implementación adecuada usaría un índice `tsvector` con `to_tsquery`, que Postgres soporta nativamente. Con más tiempo, el schema ya tiene un índice GIN que facilitaría esta migración.

**Las tags no tienen tabla propia.** Las tags se almacenan como una columna `text[]` en la tabla de bookmarks. Es simple y funciona bien a esta escala, pero operaciones como renombrar una tag en todos los marcadores o mostrar un conteo de uso se vuelven más costosas que con una tabla normalizada de tags y una tabla de relación.

**Sin paginación en la barra lateral de tags.** Si un usuario tiene cientos de tags, la barra lateral las renderiza todas a la vez. Para colecciones grandes se necesitaría búsqueda o scroll virtual en la lista de tags.

**Otras cosas que agregaría con más tiempo:**
- Supabase Realtime para sincronización en tiempo real entre dispositivos
- Importación de bookmarks en formato NETSCAPE (`.html` — el formato estándar de exportación de todos los navegadores)
- Extensión de navegador para guardar con un click desde cualquier pestaña
- Tests del frontend con Vitest y React Testing Library
- Búsqueda mejorada con ranking de relevancia usando `tsvector`
