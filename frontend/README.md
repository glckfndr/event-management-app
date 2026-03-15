# React + TypeScript + Vite

## Quick Start After Clone (Frontend only)

From repository root:

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

## Run with full stack (Docker Compose from project root)

```bash
# Linux/macOS
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env

docker compose up --build
docker compose exec backend npm run migration:run
```

## Environment variables

Create a `.env` file in this folder (you can copy from `.env.example`):

```bash
VITE_PORT=8090
VITE_API_URL=http://localhost:3001
```

## Stage 2 Frontend Coverage

Events page tests include:

- tags in list cards and tag-filter interactions
- combined search + tag filtering behavior
- assistant UI flow (submit, loading, success, fallback, error)
- assistant visibility rules for unauthenticated users
- predefined assistant suggestion prompts (`Try asking`)
- persisted recent assistant questions (`Recent questions`) via `localStorage`
- restore of recent assistant questions after page reload
- compact dropdown behavior for assistant helper sections

Run focused suite:

```bash
npx vitest run src/pages/EventsPage.test.tsx
```

## Storybook

Run Storybook locally:

```bash
npm run storybook
```

Build static Storybook output:

```bash
npm run build-storybook
```

Initial stories are available for:

- `Button`
- `FormField`
- `DeleteConfirmModal`

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
