import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveSession } from "./Session";

interface ForgotPasswordModalProps {
  showModal: boolean;
  onClose: () => void;
}

type Step = "email" | "code" | "reset";

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  showModal,
  onClose,
}) => {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const API = import.meta.env.VITE_API_BASE_URL;

  const resetAll = () => {
    setStep("email");
    setEmail("");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccessMessage("");
    setLoading(false);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  // ── Step 1: Send code ──────────────────────────────────────────────────────
  const handleSendCode = async () => {
    if (!email.trim()) return setError("Please enter your email.");
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Something went wrong");
      }
      setSuccessMessage(
        "If that email exists, a code has been sent. Check your inbox.",
      );
      setStep("code");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify code ────────────────────────────────────────────────────
  const handleVerifyCode = async () => {
    if (!code.trim()) return setError("Please enter the 6-digit code.");
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Invalid code");
      }
      setSuccessMessage("");
      setStep("reset");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Reset password ─────────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword)
      return setError("Please fill in both password fields.");
    if (newPassword !== confirmPassword)
      return setError("Passwords do not match.");
    if (newPassword.length < 6)
      return setError("Password must be at least 6 characters.");
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          newPassword,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to reset password");
      }
      const session = await res.json();
      saveSession(session);
      handleClose();
      if (session.userType === "Administrator") navigate("/adminDashboard");
      else if (session.userType === "Student") navigate("/studentdashboard");
      else navigate("/facultyAdmin");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!showModal) return null;

  const stepTitles: Record<Step, string> = {
    email: "Forgot Password",
    code: "Enter Your Code",
    reset: "Set New Password",
  };

  const stepSubtitles: Record<Step, string> = {
    email: "Enter your Quinnipiac email and we'll send you a recovery code.",
    code: `We sent a 6-digit code to ${email}@quinnipiac.edu. It expires in 15 minutes.`,
    reset: "Choose a new password for your account.",
  };

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={handleClose}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header border-0 pb-0">
            <div>
              <h5 className="modal-title fw-bold">{stepTitles[step]}</h5>
              <p className="text-muted small mb-0">{stepSubtitles[step]}</p>
            </div>
            <button type="button" className="btn-close" onClick={handleClose} />
          </div>

          <div className="modal-body pt-3">
            {/* Step indicators */}
            <div className="d-flex gap-2 mb-4">
              {(["email", "code", "reset"] as Step[]).map((s, i) => (
                <div
                  key={s}
                  className="flex-grow-1 rounded"
                  style={{
                    height: 4,
                    backgroundColor:
                      step === s ||
                      (i === 1 && step === "reset") ||
                      (i === 0 && (step === "code" || step === "reset"))
                        ? "#212529"
                        : "#dee2e6",
                    transition: "background-color 0.3s ease",
                  }}
                />
              ))}
            </div>

            {/* ── Email Step ── */}
            {step === "email" && (
              <div>
                <div className="mb-3">
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Quinnipiac E-Mail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                      autoFocus
                    />
                    <span className="input-group-text">@quinnipiac.edu</span>
                  </div>
                </div>
                {error && (
                  <div className="alert alert-danger py-2">{error}</div>
                )}
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-dark flex-grow-1"
                    onClick={handleSendCode}
                    disabled={loading}
                  >
                    {loading ? "Sending..." : "Send Code"}
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={handleClose}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ── Code Step ── */}
            {step === "code" && (
              <div>
                {successMessage && (
                  <div className="alert alert-success py-2 small">
                    {successMessage}
                  </div>
                )}
                <div className="mb-3">
                  <input
                    type="text"
                    className="form-control text-center fs-4 fw-bold letter-spacing-wide"
                    placeholder="000000"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
                    style={{ letterSpacing: "0.4em" }}
                    autoFocus
                  />
                </div>
                {error && (
                  <div className="alert alert-danger py-2">{error}</div>
                )}
                <div className="d-flex gap-2 mb-2">
                  <button
                    className="btn btn-dark flex-grow-1"
                    onClick={handleVerifyCode}
                    disabled={loading || code.length !== 6}
                  >
                    {loading ? "Verifying..." : "Continue"}
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={handleClose}
                  >
                    Cancel
                  </button>
                </div>
                <button
                  className="btn btn-link btn-sm p-0 text-muted"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError("");
                    setSuccessMessage("");
                  }}
                >
                  ← Back / Resend code
                </button>
              </div>
            )}

            {/* ── Reset Step ── */}
            {step === "reset" && (
              <div>
                <div className="mb-3">
                  <input
                    type="password"
                    className="form-control"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="mb-3">
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleResetPassword()
                    }
                  />
                </div>
                {error && (
                  <div className="alert alert-danger py-2">{error}</div>
                )}
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-dark flex-grow-1"
                    onClick={handleResetPassword}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Reset Password & Log In"}
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={handleClose}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
