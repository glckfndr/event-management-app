import type { PropsWithChildren, ReactElement } from "react";
import { render } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { authReducer } from "../features/auth/authSlice";
import { eventsReducer } from "../features/events/eventsSlice";

type TestState = {
  auth: ReturnType<typeof authReducer>;
  events: ReturnType<typeof eventsReducer>;
};

export const createTestStore = (preloadedState?: Partial<TestState>) =>
  configureStore({
    reducer: {
      auth: authReducer,
      events: eventsReducer,
    },
    preloadedState: preloadedState as TestState | undefined,
  });

type Store = ReturnType<typeof createTestStore>;

export const renderWithProviders = (
  ui: ReactElement,
  {
    store = createTestStore(),
  }: {
    store?: Store;
  } = {},
) => {
  const Wrapper = ({ children }: PropsWithChildren) => (
    <Provider store={store}>{children}</Provider>
  );

  return {
    store,
    ...render(ui, { wrapper: Wrapper }),
  };
};
