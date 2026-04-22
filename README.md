# Event Management Application

## Overview

Full-stack event management application built with React, TypeScript, NestJS, TypeORM, and PostgreSQL.

Main capabilities:

- user registration and login
- browsing public events
- controlled access to private events
- organizer-managed private invitations (invite, list, revoke)
- invitee-managed invitation responses (accept, decline) via `My Invitations`
- creating, editing, and deleting organizer-owned events
- joining and leaving events
- calendar-based `My Events` view
- AI assistant support for event-related questions

## Product User Stories

User stories are maintained in a dedicated document:

- `docs/user-stories.md`

## Tech Stack

### Frontend

- React
- TypeScript
- Redux Toolkit
- Tailwind CSS
- Vite

### Backend

- NestJS
- TypeORM
- PostgreSQL
- JWT authentication

### Tooling

- Docker
- Docker Compose
- Vitest
- Jest

## Quick Start

### Docker Compose

From the repository root:

```bash
# Linux/macOS
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env

docker compose up --build
docker compose exec backend npm run migration:run
docker compose exec backend npm run seed
```

Default URLs:

- Frontend: `http://localhost:8090`
- Backend: `http://localhost:3001`
- Swagger: `http://localhost:3001/api`

### Run Services Manually

Backend:

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

Frontend:

```bash
# Linux/macOS
cp frontend/.env.example frontend/.env

# Windows PowerShell
Copy-Item frontend/.env.example frontend/.env

cd frontend
npm install
npm run dev
```

## Architecture Review

### System Overview

The project is split into a React frontend and a NestJS backend.

- frontend is responsible for routing, forms, UI state, and user interactions
- backend is responsible for validation, authorization, persistence, and business rules
- PostgreSQL stores users, events, participants, and tags
- PostgreSQL stores users, events, participants, invitations, and tags

### Frontend Architecture

The frontend follows a page + feature + shared-components structure.

- `pages/` contains route-level containers such as `EventsPage`, `EventDetailsPage`, `CreateEventPage`, and `MyEventsPage`
- `features/` contains feature-owned `model`, `ui`, `lib`, and `api` modules
- `components/` contains reusable cross-feature UI blocks (for example generic UI controls and assistant panel)
- `shared/` contains only cross-feature primitives (API client and generic utility helpers)

State management is intentionally split:

- Redux Toolkit stores domain state such as auth, events, selected event, and assistant request state
- Zustand stores lightweight UI-only assistant state such as the current question and recent prompt history

### Backend Architecture

The backend follows a modular NestJS structure.

- controllers handle HTTP routing and request mapping
- services handle orchestration and repository interaction
- helper files contain focused business logic and validation rules
- DTOs define request contracts
- entities define persistence structure

Main backend modules:

- `auth/` handles registration, login, JWT validation, and guards
- `events/` handles event CRUD, visibility rules, and participation flows
- `assistant/` handles assistant question processing and fallback logic
- `users/` and `participants/` support identity and event membership flows

For more detailed backend boundaries, see `backend/ARCHITECTURE.md`.

### Data Model

Core entities:

- `User` organizes events and can join events
- `Event` stores title, date, location, visibility, capacity, organizer, and tags
- `Participant` is the explicit join table for user-event participation
- `EventInvitation` tracks organizer-to-user private event invitations and statuses
- `Tag` supports event categorization and frontend filtering

Important constraints:

- user emails are unique
- user-event participation pairs are unique
- event-user invitation pairs are unique
- private events are visible only to organizer or participant
- participant email addresses are hidden in event detail responses

### Authorization Model

The app uses JWT-based authentication.

- protected actions such as create, update, delete, join, and leave require authenticated users
- organizer-only actions are checked on the backend
- invitation-management actions for private events are organizer-only
- invitation response actions are limited to the invited user
- private event access is validated on the backend even if the frontend hides restricted UI
- one read route uses optional auth middleware so event details can serve both guests and signed-in users with different access levels

### Assistant Architecture

The assistant is built as a hybrid flow.

- frontend provides the assistant panel, suggestions, and recent-question persistence
- backend first uses deterministic rules and safe read-only constraints
- if configured, LLM-backed classification can be used for broader intent handling
- fallback behavior exists for unclear or unsupported questions

This keeps the assistant predictable for common cases while still allowing more flexible natural-language support.

### Page Composition Strategy

Larger pages are intentionally decomposed by responsibility.

- page components act as orchestration layers
- presentational UI blocks are split into smaller components
- async mutations and side effects are extracted into feature hooks when appropriate

Examples:

- `EventDetailsPage` coordinates state, while detail summary and edit form are split into focused feature components
- `MyEventsPage` coordinates calendar state, while week header, grid rendering, view toggle, and month navigation are separate components

### Key Tradeoffs

Current implementation tradeoffs:

- tokens are stored in `localStorage` for simplicity
- public event listing currently loads full datasets without server-side pagination
- event deletion is implemented as hard delete rather than soft delete

These choices were acceptable for an MVP, with clear next steps for production hardening.

## Interview Cheat Sheet

### Project Goal

- full-stack event management platform with auth, event CRUD, participation flows, calendar view, and assistant support

### Frontend Talking Points

- React app uses page-level containers plus smaller presentational components
- Redux Toolkit stores domain state such as auth, events, assistant request state
- Zustand stores lightweight UI-only assistant state such as recent questions
- larger pages were decomposed to keep orchestration, presentation, and side effects separate

### Backend Talking Points

- NestJS backend is organized by modules: auth, events, assistant, users, participants
- controllers stay thin, services orchestrate, helpers keep focused business logic
- validation is enforced at DTO and business-rule levels
- optional auth middleware is used for mixed-access event details, while guards protect strict routes

### Database Talking Points

- PostgreSQL with TypeORM entities for users, events, participants, and tags
- participant is an explicit join table, which keeps join/leave logic clear
- important constraints include unique email and unique user-event participation pairs

### Security Talking Points

- JWT authentication is implemented and expiration is configurable
- private event access is checked on the backend, not only hidden on the frontend
- participant emails are intentionally removed from event detail responses
- current auth tradeoff is `localStorage`; future improvement is httpOnly cookie-based session handling

### Assistant Talking Points

- assistant uses deterministic rules first and can optionally use LLM-backed classification
- recent assistant questions are persisted locally for better UX
- assistant flow is intentionally read-oriented and constrained

### Refactor Talking Points

- Event details and calendar pages were split by responsibility rather than by file size alone
- page components coordinate data and state
- smaller components render isolated UI blocks
- custom hooks or shared helpers handle async flows and reusable logic

### Production Improvements

- add server-side pagination and filtering for event lists
- add refresh-token lifecycle and stronger session handling
- replace hard delete with soft delete and basic audit trail

## Tests

```bash
# backend
cd backend
npm run lint
npm run test

# frontend
cd frontend
npm run lint
npm run test:run
```

Focused checks:

```bash
# backend assistant behavior
cd backend
npx jest assistant.service.spec.ts --watchAll=false

# frontend assistant flow
cd ../frontend
npx vitest run src/pages/EventsPage.test.tsx
```

## AI Assistant Configuration

The backend assistant can run in local rule-based mode or with LLM-backed intent classification.

- `AI_API_KEY`: enables LLM classification when set
- `AI_PROVIDER`: provider id, for example `groq` or `openai`
- `AI_MODEL`: model name to send to the provider API

Example:

```bash
AI_API_KEY=your_api_key_here
AI_PROVIDER=groq
AI_MODEL=llama-3.3-70b-versatile
```

## Security Notes

- access tokens are currently persisted in `localStorage`
- JWT expiration is configurable via `JWT_EXPIRES_IN`
- participant email addresses are intentionally hidden in event detail responses
- a future improvement is moving to httpOnly cookie-based session handling

## Project Structure

- `backend/` - NestJS API, database access, auth, assistant logic
- `frontend/` - React UI, routing, calendar, assistant interface
- `docs/` - supporting documentation and notes

For service-level setup details, see `backend/README.md` and `frontend/README.md`.
