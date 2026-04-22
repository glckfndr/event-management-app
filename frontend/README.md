# Frontend Application

## Overview

React frontend for the Event Management Application.

Main features:

- authentication flows
- public event discovery
- event details and participation actions
- organizer private invitations panel on event details (invite and revoke)
- `My Invitations` page for invitees (accept and decline)
- event creation and editing
- calendar-based "My Events" page
- AI assistant UI with suggestions and recent questions

## Quick Start

From the repository root:

```bash
# Linux/macOS
cp frontend/.env.example frontend/.env

# Windows PowerShell
Copy-Item frontend/.env.example frontend/.env

cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:8090`

## Run with full stack

From the project root:

```bash
# Linux/macOS
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env

docker compose up --build
docker compose exec backend npm run migration:run
```

## Environment Variables

Create `frontend/.env` from `frontend/.env.example`.

```bash
VITE_PORT=8090
VITE_API_URL=http://localhost:3001
```

## Available Scripts

```bash
npm run dev
npm run build
npm run lint
npm run test:run
npm run storybook
npm run build-storybook
```

## Tests

Run the full frontend suite:

```bash
npm run test:run
```

Focused Events page suite:

```bash
npx vitest run src/pages/EventsPage.test.tsx
```

Covered flows include:

- tag rendering and filtering
- combined search and tag filtering
- assistant success, loading, fallback, and error states
- assistant visibility for unauthenticated users
- predefined assistant suggestions
- persisted recent assistant questions via `localStorage`

Focused invitations page suite:

```bash
npx vitest run src/pages/MyInvitationsPage.test.tsx
```

## Storybook

Run locally:

```bash
npm run storybook
```

Build static output:

```bash
npm run build-storybook
```

Current stories include shared UI and modal components used in the app.
