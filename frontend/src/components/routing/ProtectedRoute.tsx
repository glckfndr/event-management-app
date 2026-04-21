import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import {
  selectIsAuthenticated,
  selectIsInitialized,
} from "../../features/auth/authSelectors";

type ProtectedRouteProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isInitialized = useAppSelector(selectIsInitialized);
  const location = useLocation();
  // Preserve full location so login can return user to the original target.
  const from = `${location.pathname}${location.search}${location.hash}`;

  if (!isInitialized) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from }} />;
  }

  return <>{children}</>;
}
