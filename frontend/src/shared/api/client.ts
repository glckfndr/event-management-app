import axios, {
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

const rawApiUrl = import.meta.env.VITE_API_URL;
// Local backend URL is used when VITE_API_URL is not provided.
const apiUrl = rawApiUrl?.trim() || "http://localhost:3001";

export const api = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
});

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const SAFE_METHODS = new Set(["get", "head", "options"]);

const getCookieValue = (cookieName: string): string | null => {
  const escapedCookieName = cookieName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(?:^|; )${escapedCookieName}=([^;]*)`);
  const match = document.cookie.match(regex);

  if (!match) {
    return null;
  }

  return decodeURIComponent(match[1]);
};

api.interceptors.request.use((config) => {
  const method = (config.method ?? "get").toLowerCase();

  if (!SAFE_METHODS.has(method)) {
    const csrfToken = getCookieValue(CSRF_COOKIE_NAME);

    if (csrfToken) {
      config.headers = config.headers ?? {};
      config.headers[CSRF_HEADER_NAME] = csrfToken;
    }
  }

  return config;
});

let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

type RetryAwareRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
};

type RefreshControlConfig = AxiosRequestConfig & {
  skipAuthRefresh?: boolean;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const statusCode = error?.response?.status;
    const originalRequest = error?.config as
      | RetryAwareRequestConfig
      | undefined;

    if (!originalRequest || statusCode !== 401) {
      throw error;
    }

    const requestUrl = String(originalRequest.url ?? "");
    const hasSessionSignal = Boolean(getCookieValue(CSRF_COOKIE_NAME));
    const isAuthEndpoint =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/auth/logout");

    if (
      originalRequest._retry ||
      originalRequest.skipAuthRefresh ||
      !hasSessionSignal ||
      isAuthEndpoint
    ) {
      throw error;
    }

    originalRequest._retry = true;

    if (!isRefreshing) {
      isRefreshing = true;
      const refreshConfig: RefreshControlConfig = {
        skipAuthRefresh: true,
      };

      refreshPromise = api
        .post("/auth/refresh", {}, refreshConfig)
        .then(() => undefined)
        .finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
    }

    await refreshPromise;
    return api(originalRequest);
  },
);
