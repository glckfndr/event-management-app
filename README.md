# Event Management Application

## Overview

This is a full-stack Event Management web application built with React (TypeScript) and NestJS.

The system allows users to:

- Register and authenticate securely
- Discover and join public events
- Access private events only when allowed (organizer or participant)
- Create, edit, and delete their own events
- Manage personal schedules using a calendar view

---

## User Stories

### Guest

- As a guest, I want to browse public events so I can discover interesting activities.
- As a guest, I want to view event details so I can decide whether to participate.
- As a guest, I want to register so I can join events.

### Authenticated User

- As a user, I want to log in securely so I can access protected features.
- As a user, I want to join and leave events.
- As a user, I want to view my events in a calendar.

### Organizer

- As an organizer, I want to create events.
- As an organizer, I want to edit and delete my own events.
- As an organizer, I want to view participants.

---

## Acceptance Criteria

- Only authenticated users can create events.
- Users cannot join the same event twice (unique participant constraint is enforced).
- Event capacity is enforced when provided; omitted capacity means unlimited participants.
- Only organizers can edit or delete their events.
- Private events are accessible only to authenticated organizers or participants.
- Participant email addresses are not exposed in event detail responses.

---

## Tech Stack

### Frontend

- React + TypeScript
- Redux Toolkit
- Tailwind CSS

### Backend

- NestJS
- TypeORM
- PostgreSQL
- JWT Authentication

### DevOps

- Docker
- Docker Compose

---

## Local Development

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 16+ (if running without Docker)

### Backend (NestJS)

```bash
cd backend
npm install
npm run migration:run
npm run start:dev
```

Backend runs on `http://localhost:3001` by default.

### Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:8090` by default.
If needed, set `VITE_API_URL` to point to backend API.

### Tests and Lint

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

---

## Security Notes

- The frontend currently persists access tokens in `localStorage` for session persistence.
- Tradeoff: this increases token exposure risk in case of XSS.
- Current mitigations:
  - Validate and sanitize inputs via DTO/form validation.
  - Keep JWT expiration short (`JWT_EXPIRES_IN`).
  - Avoid exposing participant emails in event details responses.
- Planned improvement: migrate to httpOnly cookie-based auth/session flow with CSRF protections.

## Architecture Overview

The application follows a modular full-stack architecture with clear separation of concerns between frontend and backend.

### Backend Architecture (NestJS)

The backend is built using a modular structure:

- **Auth Module** – Handles user registration, login, JWT authentication, and route protection.
- **Users Module** – Manages user-related operations.
- **Events Module** – Contains business logic for event creation, update, deletion, and retrieval.
- **Participants Logic** – Handles join/leave functionality and enforces unique participation per user/event.

The application follows REST principles and uses DTOs for request validation.
Business logic is placed in services, while controllers handle routing only.

Authentication is implemented using JWT strategy with protected routes via guards.

---

### Database Design

The system uses PostgreSQL with TypeORM.

Main entities:

- **User**
  - One-to-many relation with organized events
- **Event**
  - Many-to-many relation with users (participants)
- **Participant**
  - Explicit join table to manage event participation

The database schema enforces:

- Unique user emails
- Unique user/event participant pairs
- Proper relationship handling

---

### Frontend Architecture (React)

The frontend follows a feature-based structure:

- **Authentication Layer**
  - Login & Register pages
  - JWT stored in client state
  - Protected routes

- **State Management**
  - Redux Toolkit for global state
  - Async actions for API communication

- **Component Structure**
  - Pages: Events List, Event Details, Create Event, My Events
  - Reusable UI components (cards, forms, modals)

The frontend communicates with the backend via a centralized Axios API layer.

---

### DevOps & Deployment

The application is fully containerized using Docker and Docker Compose:

- PostgreSQL container
- NestJS backend container
- React frontend container

The project can be started with a single command:

```bash
docker compose up
```

### Docker Compose commands

Before running Docker Compose, create a root `.env` file (copy from `.env.example`) and set:

```bash
DB_PASSWORD=your_strong_password_here
BACKEND_PUBLIC_URL=http://localhost:3001
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1h
```

For access from another device in your local network, set `BACKEND_PUBLIC_URL` to your host IP,
for example `http://192.168.0.10:3001`.

```bash
# build images and start all services
docker compose up --build

# start in background
docker compose up -d

# view logs for all services
docker compose logs -f

# view logs for one service
docker compose logs -f backend

# stop and remove containers
docker compose down

# stop and remove containers + database volume
docker compose down -v
```
