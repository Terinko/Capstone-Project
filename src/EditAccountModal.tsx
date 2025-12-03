import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient"; // same as CreateAccountModal
// :contentReference[oaicite:0]{index=0}

type UserType = "Student" | "Faculty/Administrator";

interface EditAccountModalProps {
  showModal: boolean;
  onClose: () => void;
  userType: UserType;
  userId: number; // Student_Id or Faculty_Id
}

const EditAccountModal: React.FC<EditAccountModalProps> = ({
  showModal,
  onClose,
  userType,
  userId,
}) => {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [major, setMajor] = useState(""); // students only

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [initialLoading, setInitialLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load user from DB when modal opens
  useEffect(() => {
    if (!showModal || !userId) return;

    const fetchUser = async () => {
      setInitialLoading(true);
      setError("");
      setSuccess("");

      try {
        const table = userType === "Student" ? "Student" : "Faculty_Admin";
        const idColumn = userType === "Student" ? "Student_Id" : "Faculty_Id";

        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq(idColumn, userId)
          .single();

        if (error) throw error;
        if (!data) throw new Error("Account not found");

        setFirstName(data.FirstName || "");
        setLastName(data.LastName || "");
        if (userType === "Student") {
          setMajor(data.Major || "");
          setEmail(data.Student_Qu_Email || "");
        } else {
          setEmail(data.Faculty_Qu_Email || "");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load account");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchUser();
  }, [showModal, userId, userType]);

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
      if (password || confirmPassword) {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
      }

      const table = userType === "Student" ? "Student" : "Faculty_Admin";
      const idColumn = userType === "Student" ? "Student_Id" : "Faculty_Id";

      const updatePayload: Record<string, any> = {
        FirstName: firstName,
        LastName: lastName,
      };

      if (userType === "Student") {
        updatePayload.Major = major;
      }

      if (password) {
        updatePayload.Password = password;
      }

      const { error } = await supabase
        .from(table)
        .update(updatePayload)
        .eq(idColumn, userId);

      if (error) throw error;

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
                {/* Account type (read-only) */}
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
