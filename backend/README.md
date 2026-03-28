# Backend API

## Overview

NestJS backend for the Event Management Application.

Main responsibilities:

- authentication and JWT validation
- public and private event access control
- event CRUD operations
- join and leave flows
- calendar data for authenticated users
- assistant endpoints for event-related questions

## Quick Start

From the repository root:

```bash
# Linux/macOS
cp backend/.env.example backend/.env

# Windows PowerShell
Copy-Item backend/.env.example backend/.env

cd backend
npm install
npm run migration:run
npm run seed
npm run start:dev
```

Default URLs:

- API: `http://localhost:3001`
- Swagger: `http://localhost:3001/api`

## Docker Compose

From the project root:

```bash
docker compose up --build
docker compose exec backend npm run migration:run
docker compose exec backend npm run seed
```

Useful commands:

```bash
docker compose up -d
docker compose logs -f backend
docker compose down
docker compose down -v
```

## Environment Variables

Create `backend/.env` from `backend/.env.example`.

Typical variables:

```bash
PORT=3001
FRONTEND_URL=http://localhost:8090,http://127.0.0.1:8090
ENABLE_SWAGGER=true
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=event_user
DB_PASSWORD=your_strong_password_here
DB_DATABASE=event_management
DB_SYNCHRONIZE=false

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1h

# optional assistant configuration
AI_API_KEY=your_api_key_here
AI_PROVIDER=groq
AI_MODEL=llama-3.3-70b-versatile
```

Assistant behavior:

- without `AI_API_KEY`, the assistant uses local deterministic rules and fallback messages
- with `AI_API_KEY`, the assistant can use LLM-backed intent classification

## Available Scripts

```bash
npm run start:dev
npm run lint
npm run test
npm run test:e2e
npm run test:cov
npm run migration:run
npm run migration:revert
npm run migration:create
npm run migration:generate
npm run seed
```

## Testing Notes

Focused assistant suite:

```bash
npx jest assistant.service.spec.ts --watchAll=false
```

This covers:

- tag constraints and filtering behavior
- fallback behavior for unsupported or unclear intents
- read-only assistant restrictions
- date and scope-related assistant queries

## Seeding

Run after migrations:

```bash
npm run seed
```

Notes:

- seeding is blocked in `production` by default
- `ALLOW_SEED_IN_PRODUCTION=true` explicitly enables it in production-like environments
- optional password overrides: `SEED_ALICE_PASSWORD`, `SEED_BOB_PASSWORD`

The seed is idempotent and creates demo users and sample events when missing.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for backend structure and module boundaries.
