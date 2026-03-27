# User Stories

This document captures the core product stories for the Event Management Application.

## Epic: Public Discovery

### Story US-01: Browse public events

As a guest, I want to browse public events so that I can discover what is available.

Acceptance Criteria:

- Public events are visible without authentication.
- Event cards show essential information (title, date, location, visibility).

Priority: Must

### Story US-02: View event details as guest

As a guest, I want to open event details so that I can decide whether to join after logging in.

Acceptance Criteria:

- Public event details are viewable without authentication.
- Private event details are protected based on backend access rules.

Priority: Must

## Epic: Authentication And Participation

### Story US-03: Register and log in

As a user, I want to register and log in so that I can access protected event actions.

Acceptance Criteria:

- Registration validates email uniqueness.
- Login returns an access token for authenticated requests.

Priority: Must

### Story US-04: Join and leave events

As a user, I want to join and leave events so that I can manage my participation.

Acceptance Criteria:

- Joining requires authentication.
- A user cannot join the same event twice.
- Leaving removes participation state in backend and UI.

Priority: Must

### Story US-05: Use calendar for my events

As a user, I want a calendar view of my events so that I can plan my schedule.

Acceptance Criteria:

- `My Events` shows user-related events grouped by date.
- Calendar navigation supports moving between months/weeks.

Priority: Should

## Epic: Organizer Management

### Story US-06: Create events

As an organizer, I want to create events so that I can publish activities for others.

Acceptance Criteria:

- Create form validates required fields.
- Organizer is stored as the event owner.

Priority: Must

### Story US-07: Edit owned events

As an organizer, I want to edit my own events so that I can keep event data accurate.

Acceptance Criteria:

- Only event owner can edit event content.
- Updated values are reflected in list and detail views.

Priority: Must

### Story US-08: Delete owned events

As an organizer, I want to delete my own events so that I can remove canceled or obsolete events.

Acceptance Criteria:

- Only event owner can delete an event.
- Deleted events are no longer available in event listings.

Priority: Should

## Epic: Assistant Experience

### Story US-09: Ask assistant questions

As a user, I want to ask event-related questions in natural language so that I can quickly find relevant information.

Acceptance Criteria:

- Assistant accepts free-text input from the UI.
- Assistant returns a safe, readable answer with fallback behavior for unsupported queries.

Priority: Should

### Story US-10: Reuse recent assistant prompts

As a returning user, I want recent questions to be remembered so that I can quickly reuse common prompts.

Acceptance Criteria:

- Recent assistant prompts are persisted locally.
- Recent prompts can be selected again from the assistant panel.

Priority: Could

## Traceability

Story-to-module mapping (frontend and backend ownership):

| Story | Frontend scope                                                                              | Backend scope                                                                                                            |
| ----- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| US-01 | `frontend/src/pages/EventsPage*`, `frontend/src/features/events/*`                          | `backend/src/events/events.controller.ts`, `backend/src/events/events.service.ts`                                        |
| US-02 | `frontend/src/pages/EventDetailsPage*`                                                      | `backend/src/events/events.controller.ts`, `backend/src/events/events.service.ts`, `backend/src/auth/auth.middleware.ts` |
| US-03 | `frontend/src/features/auth/*`, auth pages/components                                       | `backend/src/auth/*`, `backend/src/users/*`                                                                              |
| US-04 | event actions/components in `frontend/src/components/` and `frontend/src/features/events/*` | `backend/src/events/events.controller.ts`, `backend/src/events/events.service.ts`, `backend/src/participants/*`          |
| US-05 | `frontend/src/pages/MyEventsPage*`, calendar components/hooks                               | `backend/src/events/events.controller.ts`, `backend/src/events/events.service.ts`                                        |
| US-06 | `frontend/src/pages/CreateEventPage*`, create form components/hooks                         | `backend/src/events/events.controller.ts`, `backend/src/events/events.service.ts`, `backend/src/events/dto/*`            |
| US-07 | edit form/components in event details flow                                                  | `backend/src/events/events.controller.ts`, `backend/src/events/events.service.ts`, `backend/src/events/dto/*`            |
| US-08 | delete modal/action in event details flow                                                   | `backend/src/events/events.controller.ts`, `backend/src/events/events.service.ts`                                        |
| US-09 | assistant panel/components and request flow in `frontend/src/features/assistant/*`          | `backend/src/assistant/*`                                                                                                |
| US-10 | recent prompts persistence in assistant UI state                                            | `backend/src/assistant/*` (answer flow), local persistence on frontend                                                   |

## Status Tracking

| Story | Status     | Notes                                                     |
| ----- | ---------- | --------------------------------------------------------- |
| US-01 | Done (MVP) | Public events browse flow is part of current scope.       |
| US-02 | Done (MVP) | Guest-access details with private visibility constraints. |
| US-03 | Done (MVP) | Registration and login with JWT.                          |
| US-04 | Done (MVP) | Join/leave participation implemented with auth checks.    |
| US-05 | Done (MVP) | `My Events` calendar-based view present.                  |
| US-06 | Done (MVP) | Organizer create-event flow implemented.                  |
| US-07 | Done (MVP) | Organizer edit permissions enforced.                      |
| US-08 | Done (MVP) | Organizer delete-event flow implemented.                  |
| US-09 | Done (MVP) | Assistant question/answer flow implemented.               |
| US-10 | Done (MVP) | Recent prompts persistence supported in assistant UX.     |
