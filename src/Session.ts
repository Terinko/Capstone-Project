export type UserType = "Student" | "Faculty/Administrator";

export interface UserSession {
  userId: number;
  userType: UserType;
  userEmail: string;
}

const STORAGE_KEY = "quResumeSession";

export function saveSession(session: UserSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadSession(): UserSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as UserSession;
    if (
      typeof parsed.userId === "number" &&
      (parsed.userType === "Student" ||
        parsed.userType === "Faculty/Administrator") &&
      typeof parsed.userEmail === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}
