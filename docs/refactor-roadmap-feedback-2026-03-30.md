# Refactor Roadmap (за результатами фідбеку)

Дата: 2026-03-30
Стратегія гілок для роботи:

- Базова інтеграційна гілка для етапу: `feature/architecture-refactor-phase-*`
- Task-гілки: `feature/issue-*-*` від відповідної phase-гілки
- PR для задачі: `feature/issue-*-*` -> `feature/architecture-refactor-phase-*`

Приклад flow:

1. Backend етап (phase-1):

- `feature/issue-1-*` -> `feature/architecture-refactor-phase-1`
- `feature/issue-2-*` -> `feature/architecture-refactor-phase-1`
- Після інтеграції задач: `feature/architecture-refactor-phase-1` -> `main`

2. Frontend етап (phase-2):

- `feature/issue-3-*` -> `feature/architecture-refactor-phase-2`
- Наступні frontend issue-гілки також у `feature/architecture-refactor-phase-2`
- Після інтеграції задач: `feature/architecture-refactor-phase-2` -> `main`

## Ціль

Покращити підтримуваність і читабельність без зміни бізнес-поведінки:

- Backend: спростити теги та AI-асистента, зробити явні зони відповідальності.
- Frontend: перейти до більш масштабованої структури (feature-first), спростити декомпозицію компонентів, зробити routing явним.

## Scope (пріоритетні файли)

Backend:

- backend/src/events/events-tags.helpers.ts
- backend/src/assistant/assistant.service.ts
- backend/src/assistant/assistant-answer.helpers.ts
- backend/src/assistant/assistant-text.helpers.ts
- backend/src/assistant/assistant-format.helpers.ts
- backend/src/assistant/assistant-constraints.helpers.ts

Frontend:

- frontend/src/App.tsx
- frontend/src/components/\*\*
- frontend/src/features/events/\*\*
- frontend/src/shared/api.ts
- frontend/src/shared/navigation.ts
- frontend/src/shared/eventValidation.ts

## Фази

### Phase 0 - Baseline і безпечний старт

Задача:

- Зафіксувати поточний стан тестів перед рефактором.

Кроки:

1. Запустити backend тести.
2. Запустити frontend тести.
3. Зберегти короткий лог результатів у PR-описі.

Команди:

- backend: `cd backend && npm test`
- frontend: `cd frontend && npm run test:run`

Ризик: низький.

---

### Phase 1 - Backend: спрощення events-tags.helpers

Ціль:

- Зберегти поведінку, але зробити лінійний і читабельний pipeline.

Файл:

- backend/src/events/events-tags.helpers.ts

План змін:

1. Виділити окремі кроки в приватні функції:

- normalizeAndValidateTagNames
- loadExistingTagsByName
- createMissingTags
- resolveEventTags (оркестратор, публічна API-функція)

2. Скоротити try/catch до вузького місця (тільки створення відсутніх тегів).
3. Не змінювати публічний контракт функції, що викликається з service.

Валідація:

- `cd backend && npm test -- events-tags`
- `cd backend && npm test -- events.service`

Ризик: низький-середній.

---

### Phase 2 - Backend: декомпозиція assistant.service

Ціль:

- Явно розділити контекст, scope-логіку і виклик LLM.

Поточна проблема:

- backend/src/assistant/assistant.service.ts поєднує завантаження даних, підготовку контексту, fallback-логіку і оркестрацію.

План змін (мінімально інвазивно):

1. Створити модулі:

- backend/src/assistant/assistant-data.service.ts
- backend/src/assistant/assistant-scope.resolver.ts
- backend/src/assistant/assistant-fallback.resolver.ts

Примітка:

- Допускаються еквівалентні назви (`*.repository.ts`, `resolvers/*`) за умови, що межі відповідальності збережені: data/context, scope, fallback.

2. Залишити в AssistantService лише сценарій:

- classify -> build context -> call llm -> post-process

3. Прибрати багаторівневий fallback pipeline, залишивши 1 прозору fallback-стратегію.
4. Явно назвати межі відповідальності через типи/DTO між кроками.

Валідація:

- `cd backend && npm test -- assistant.service`
- `cd backend && npm test -- assistant`

Ризик: середній.

---

### Phase 3 - Frontend: явний routing і config

Ціль:

- Прибрати неявний роутинг із root-компонента, зробити маршрути централізованими.

Файли:

- frontend/src/App.tsx
- frontend/src/shared/navigation.ts

План змін:

1. Додати:

- frontend/src/app/router.tsx
- frontend/src/app/routes.ts

2. Перенести route-константи з shared у app-level.
3. Залишити в App.tsx тільки підключення router-провайдера.

Валідація:

- `cd frontend && npm run test:run -- App`
- `cd frontend && npm run test:run`

Ризик: низький.

---

### Phase 4 - Frontend: feature-first для events

Ціль:

- Перетворити frontend/src/features/events на повну фічу (не лише store/hooks).

План цільової структури:

- frontend/src/features/events/model/\* (slice/selectors/state)
- frontend/src/features/events/ui/\* (feature-компоненти)
- frontend/src/features/events/lib/\* (helper/format/validation)
- frontend/src/features/events/api/\* (feature API)

Міграція:

1. Перенести event-related компоненти з frontend/src/components/event-details та frontend/src/components/event-form у frontend/src/features/events/ui.
2. Перенести eventValidation у frontend/src/features/events/lib.
3. Оновити імпорти зі сторінок.

Валідація:

- `cd frontend && npm run test:run -- EventsPage`
- `cd frontend && npm run test:run -- EventDetailsPage`
- `cd frontend && npm run test:run -- CreateEventPage`

Ризик: середній.

---

### Phase 5 - Frontend: shared cleanup

Ціль:

- Прибрати роль "звалища" для shared.

План:

1. Явні піддиректорії:

- frontend/src/shared/ui
- frontend/src/shared/lib
- frontend/src/shared/api
- frontend/src/shared/config
- frontend/src/shared/types

2. Винести тільки реально повторно використовувані елементи.
3. Все, що належить конкретній фічі, повернути у features.

Валідація:

- `cd frontend && npm run test:run`

Ризик: низький.

## Правила виконання (щоб не зламати поточний функціонал)

1. Кожна фаза окремим PR або окремою логічною серією комітів.
2. Спочатку переміщення/перейменування без логічних змін, потім спрощення логіки.
3. Після кожної фази - повний прогін `npm run test:run` у frontend (відповідно до політики репозиторію).
4. Для backend фаз - як мінімум таргетні тести модуля + бажано повний прогін.

## Орієнтовний порядок впровадження

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5

Такий порядок дає швидкі покращення на backend спочатку, а потім структурно стабілізує frontend без великого одноразового ризику.
