import axios from "axios";

const rawApiUrl = import.meta.env.VITE_API_URL;
// Local backend URL is used when VITE_API_URL is not provided.
const apiUrl = rawApiUrl?.trim() || "http://localhost:3001";

export const api = axios.create({
  baseURL: apiUrl,
});

export const getAuthHeader = (token: string | null) =>
  // Keep call sites simple by returning undefined when no token exists.
  token ? { Authorization: `Bearer ${token}` } : undefined;
