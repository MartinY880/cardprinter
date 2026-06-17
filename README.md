# Card Design Studio

Self-hosted web app for designing and printing CR-80 employee ID cards on an Evolis Primacy 2 card printer. Integrates with Microsoft Graph (M365 user directory + photos) and PDK access control for card assignment.

## Features

- CR-80 canvas (3.375" × 2.125" at 300 DPI) with drag-and-drop element positioning
- Microsoft 365 integration — pull employee directory and profile photos via Graph API
- PDK integration — search holders and assign card numbers directly
- Preset system — save/load card templates with a default for new users
- CSV import for employee data
- Print log tracking
- Master PIN lock to restrict template editing
- Export/import templates as JSON
- Dark theme UI with real-time preview

## Architecture

Two services:

| Service | Stack | Role |
|---|---|---|
| `frontend` | nginx + React (Vite) | Serves the SPA, proxies external APIs and internal `/api/*` |
| `api` | Node.js | Stores credentials, presets, employees, and print log on a named volume |

## Local Development

```bash
npm install
npm run dev
```

The Vite dev server proxies `/api/*` to the Node API server. Start the API separately:

```bash
node server/creds-api.cjs
```

## Docker (local test)

```bash
docker compose up -d --build
```

Access at `http://localhost:8470`

## Portainer Swarm Deployment

### 1. Build and push images

```bash
# Frontend
docker build -t your-registry/card-design-studio-frontend:latest .

# API
docker build -f Dockerfile.api -t your-registry/card-design-studio-api:latest ./server

docker push your-registry/card-design-studio-frontend:latest
docker push your-registry/card-design-studio-api:latest
```

### 2. Deploy in Portainer

**Stacks → Add stack → Web editor** (paste `docker-stack.yml`) or upload the file.

Set the following environment variables in Portainer before deploying:

| Variable | Description |
|---|---|
| `REGISTRY` | Registry prefix with trailing slash, e.g. `your-registry/` |
| `TAG` | Image tag (default: `latest`) |
| `PORT` | Host port to expose (default: `8470`) |
| `GRAPH_TENANT_ID` | Azure AD tenant ID |
| `GRAPH_CLIENT_ID` | Azure app client ID |
| `GRAPH_CLIENT_SECRET` | Azure app client secret |
| `PDK_CLIENT_ID` | PDK client ID |
| `PDK_CLIENT_SECRET` | PDK client secret |

Credentials are seeded from env vars on first start and written to the `api-data` named volume. After that the volume takes precedence, so credentials updated via the UI survive container restarts and redeployments.

### Azure App Registration (Graph API)

The app requires an Azure AD app registration with:

- **API permission**: `User.Read.All` (Application, not Delegated) — grant admin consent
- A client secret scoped to the registration

### PDK

Create an OAuth client in your PDK account portal and supply the client ID and secret.

## Data Persistence

The `api` service stores all mutable data under `DATA_DIR` (default `/data` in Docker), mounted as the `api-data` named volume:

| File | Contents |
|---|---|
| `creds.json` | Graph and PDK credentials |
| `presets.json` | Saved card templates |
| `employees.json` | Employee roster |
| `printlog.json` | Print history |

These files are excluded from git and Docker build contexts.
