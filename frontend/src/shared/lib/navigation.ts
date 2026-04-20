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

  // Reject absolute/protocol-like paths to avoid open redirect vectors.
  if (
    trimmedPath.startsWith("//") ||
    trimmedPath.includes("://") ||
    trimmedPath.includes("\\")
  ) {
    return fallbackPath;
  }

  return trimmedPath;
};
