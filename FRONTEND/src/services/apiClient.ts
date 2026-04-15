// FRONTEND/src/services/apiClient.ts
import { loadSession, clearSession } from "../Session";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

/**
 * A centralized wrapper for the standard fetch API.
 * Automatically attaches authorization headers and handles 401 unauthenticated errors.
 */
export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const session = loadSession();

  const headers = new Headers({
    "Content-Type": "application/json",
    ...(options?.headers ?? {}),
  });

  // If a session exists, attach the JWT token
  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Global handler for expired or invalid sessions
  if (response.status === 401) {
    await clearSession();
    window.location.href = "/";
    throw new Error("Session expired. Please log in again.");
  }

  // Handle standard HTTP errors
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.error || `Request failed with status: ${response.status}`,
    );
  }

  // Handle empty responses gracefully (e.g., 204 No Content)
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}
