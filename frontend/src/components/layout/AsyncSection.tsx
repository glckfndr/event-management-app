import type { ReactNode } from "react";

type AsyncSectionProps = {
  isLoading: boolean;
  loadingFallback: ReactNode;
  errorMessage?: string | null;
  errorFallback?: ReactNode;
  children: ReactNode;
};

export function AsyncSection({
  isLoading,
  loadingFallback,
  errorMessage = null,
  errorFallback,
  children,
}: AsyncSectionProps) {
  if (errorMessage) {
    return (
      <>{errorFallback ?? <p className="text-red-600">{errorMessage}</p>}</>
    );
  }

  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  return <>{children}</>;
}
