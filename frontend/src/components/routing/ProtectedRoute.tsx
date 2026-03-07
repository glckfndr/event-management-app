import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";

type ProtectedRouteProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = useAppSelector((state) => state.auth.token);
  const location = useLocation();
  const from = `${location.pathname}${location.search}${location.hash}`;

  if (!token) {
    return <Navigate to="/login" replace state={{ from }} />;
  }

  return <>{children}</>;
}
