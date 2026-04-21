import type { RootState } from "../../app/store";

export const selectIsAuthenticated = (state: RootState): boolean =>
  state.auth.isAuthenticated ?? Boolean(state.auth.token);

export const selectIsInitialized = (state: RootState): boolean =>
  state.auth.isInitialized ?? true;
