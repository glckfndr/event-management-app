export const getSafeReturnPath = (
  from: unknown,
  fallbackPath = "/events",
): string => {
  if (typeof from !== "string") {
    return fallbackPath;
  }

  const trimmedPath = from.trim();

  if (!trimmedPath.startsWith("/")) {
    return fallbackPath;
  }

  if (
    trimmedPath.startsWith("//") ||
    trimmedPath.includes("://") ||
    trimmedPath.includes("\\")
  ) {
    return fallbackPath;
  }

  return trimmedPath;
};
