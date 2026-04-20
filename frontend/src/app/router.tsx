import {
  Navigate,
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { MainLayout } from "../components/layout/MainLayout";
import { ProtectedRoute } from "../components/routing/ProtectedRoute";
import { CreateEventPage } from "../pages/CreateEventPage";
import { EventDetailsPage } from "../pages/EventDetailsPage";
import { EventsPage } from "../pages/EventsPage";
import { LoginPage } from "../pages/LoginPage";
import { MyEventsPage } from "../pages/MyEventsPage";
import { RegisterPage } from "../pages/RegisterPage";
import { APP_ROUTES } from "./routes";

const appRoutes = [
  {
    path: APP_ROUTES.login,
    element: <LoginPage />,
  },
  {
    path: APP_ROUTES.register,
    element: <RegisterPage />,
  },
  {
    element: <MainLayout />,
    children: [
      {
        path: APP_ROUTES.root,
        element: <Navigate to={APP_ROUTES.events} replace />,
      },
      {
        path: APP_ROUTES.events,
        element: <EventsPage />,
      },
      {
        path: APP_ROUTES.eventDetails,
        element: <EventDetailsPage />,
      },
      {
        path: APP_ROUTES.createEvent,
        element: (
          <ProtectedRoute>
            <CreateEventPage />
          </ProtectedRoute>
        ),
      },
      {
        path: APP_ROUTES.myEvents,
        element: (
          <ProtectedRoute>
            <MyEventsPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: APP_ROUTES.wildcard,
    element: <Navigate to={APP_ROUTES.events} replace />,
  },
];

const appRouter = createBrowserRouter(appRoutes);

export const AppRouterProvider = () => {
  return <RouterProvider router={appRouter} />;
};
