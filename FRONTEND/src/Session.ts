const SESSION_KEY = "qu_session";

export interface Session {
  token: string;
  userType: string;
  userEmail: string;
}

export function saveSession(session: Session): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): Session | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const raw = sessionStorage.getItem(SESSION_KEY);

  if (raw) {
    try {
      const session = JSON.parse(raw) as Session;
      const API_BASE =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

      // Decode the JWT payload to get the user's ID
      const payload = JSON.parse(atob(session.token.split(".")[1]));

      // Map the JWT userType to match your AuditLogs database format
      let mappedUserType = "STUDENT";
      if (payload.userType === "Administrator") mappedUserType = "ADMIN";
      if (payload.userType === "Faculty/Administrator")
        mappedUserType = "FACULTY";

      // Tell the backend to record the LOGOUT action
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: payload.userId,
          email: payload.userEmail,
          user_type: mappedUserType,
        }),
      });
    } catch (error) {
      console.error("Failed to record logout audit log:", error);
    }
  }

  // Finally, wipe the local browser memory
  sessionStorage.removeItem(SESSION_KEY);
}

export function isLoggedIn(): boolean {
  return loadSession() !== null;
}
