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

Single Node.js container handles everything:

| Responsibility | How |
|---|---|
| React SPA | Serves `dist/` as static files with SPA fallback |
| Internal API | `/api/creds`, `/api/presets`, `/api/employees`, `/api/printlog` |
| Azure AD proxy | `POST /api/token/{tenantId}` → `login.microsoftonline.com` |
| PDK proxy | `/pdk/auth/*`, `/pdk/accounts/*`, `/pdk/systems/*` |

Traefik handles TLS termination and routing. Data is persisted on a named Docker volume.

## Local Development

```bash
npm install
npm run dev       # Vite dev server (proxies /api/* and /pdk/* via vite.config.js)
node server/creds-api.cjs   # API server on :3000
```

## Docker (local test)

```bash
docker compose up -d --build
# App available at http://localhost:3000
```

## Portainer Swarm Deployment

### 1. Build and push the image

```bash
docker build -t your-registry/card-design-studio:latest .
docker push your-registry/card-design-studio:latest
```

### 2. Deploy in Portainer

**Stacks → Add stack → Web editor** (paste `docker-stack.yml`) or upload the file.

Set these environment variables in Portainer before deploying:

| Variable | Description |
|---|---|
| `REGISTRY` | Registry prefix with trailing slash, e.g. `ghcr.io/martiny880/` |
| `TAG` | Image tag (default: `latest`) |
| `GRAPH_TENANT_ID` | Azure AD tenant ID |
| `GRAPH_CLIENT_ID` | Azure app client ID |
| `GRAPH_CLIENT_SECRET` | Azure app client secret |
| `PDK_CLIENT_ID` | PDK client ID |
| `PDK_CLIENT_SECRET` | PDK client secret |

The stack attaches to the `traefik_traefik-swarm` external network and routes via Traefik to `cardprinter-dev.pros.mortgage`.

> **Note:** Traefik labels use `certresolver=letsencrypt` — update this if your Traefik instance uses a different resolver name.

### Azure App Registration (Graph API)

Requires an Azure AD app registration with:
- **API permission**: `User.Read.All` (Application, not Delegated) — grant admin consent
- A client secret

### PDK

Create an OAuth client in your PDK account portal. The System ID is discovered automatically from the API.

## Credentials & Data Persistence

Credentials are seeded from environment variables on first start, then written to the `card-studio-data` named volume at `/data`. After the first start the volume takes precedence, so credentials updated via the UI survive restarts and redeployments.

| File | Contents |
|---|---|
| `/data/creds.json` | Graph and PDK credentials |
| `/data/presets.json` | Saved card templates |
| `/data/employees.json` | Employee roster |
| `/data/printlog.json` | Print history |

These files are excluded from git and Docker build contexts.
