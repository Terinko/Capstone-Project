import React, { useEffect, useState } from "react";
import { loadSession, clearSession } from "./Session";

type UserType = "Student" | "Faculty/Administrator";

interface EditAccountModalProps {
  showModal: boolean;
  onClose: () => void;
  userType: UserType;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE) {
  throw new Error("VITE_API_BASE_URL is not defined");
}

// Centralized fetch helper — sends JWT, handles expiry
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const session = loadSession();

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(session && { Authorization: `Bearer ${session.token}` }),
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401) {
    clearSession();
    window.location.href = "/";
    throw new Error("Session expired, please log in again");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

const EditAccountModal: React.FC<EditAccountModalProps> = ({
  showModal,
  onClose,
  userType,
}) => {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [major, setMajor] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [initialLoading, setInitialLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch current account info from the backend using the JWT —
  // the server resolves who the user is from the token, not from a passed-in userId
  useEffect(() => {
    if (!showModal) return;

    const fetchUser = async () => {
      setInitialLoading(true);
      setError("");
      setSuccess("");

      try {
        const data = await apiFetch<{
          firstName: string;
          lastName: string;
          email: string;
          major?: string;
        }>("/api/auth/me");

        setFirstName(data.firstName);
        setLastName(data.lastName);
        setEmail(data.email);
        if (userType === "Student") setMajor(data.major ?? "");
      } catch (err: any) {
        setError(err.message || "Failed to load account");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchUser();
  }, [showModal, userType]);

  const handleClose = () => {
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      if (password && password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      const body: Record<string, any> = { firstName, lastName };
      if (userType === "Student") body.major = major;
      // Only include password in payload if the user actually typed one
      if (password) body.password = password;

      await apiFetch("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify(body),
      });

      setSuccess("Account updated successfully.");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to update account");
    } finally {
      setSaving(false);
    }
  };

  if (!showModal) return null;

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={handleClose}
    >
      <div
        className="modal-dialog modal-dialog-centered modal-dialog-scrollable"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Edit Account Info</h5>
            <button
              type="button"
              className="btn-close"
              onClick={handleClose}
            ></button>
          </div>

          <div className="modal-body">
            {initialLoading ? (
              <p>Loading account...</p>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Account Type</label>
                  <input
                    type="text"
                    className="form-control"
                    value={userType}
                    disabled
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>

                {userType === "Student" && (
                  <div className="mb-3">
                    <label className="form-label">Major</label>
                    <input
                      type="text"
                      className="form-control"
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                    />
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label">Quinnipiac E-Mail</label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    disabled
                  />
                </div>

                <hr />

                <p className="mb-2">
                  <strong>Change Password (optional)</strong>
                </p>

                <div className="mb-3">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="alert alert-success" role="alert">
                    {success}
                  </div>
                )}

                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-dark flex-grow-1"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditAccountModal;
