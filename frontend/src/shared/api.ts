import axios from "axios";

const rawApiUrl = import.meta.env.VITE_API_URL;
const apiUrl = rawApiUrl?.trim() || "http://localhost:3001";

export const api = axios.create({
  baseURL: apiUrl,
});

export const getAuthHeader = (token: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : undefined;
