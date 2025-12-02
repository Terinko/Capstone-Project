import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

interface LoginModalProps {
  showModal: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ showModal, onClose }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1) Try Student table
      const { data: studentData, error: studentError } = await supabase
        .from("Student")
        .select("*")
        .eq("Student_Qu_Email", email)
        .eq("Password", password)
        .single();

      if (studentData) {
        console.log("Student logged in:", studentData);

        // Save session info for Navbar/EditAccountModal
        localStorage.setItem("userId", String(studentData.Student_Id));
        localStorage.setItem("userType", "Student");
        localStorage.setItem("userEmail", studentData.Student_Qu_Email);

        resetForm();
        onClose();

        // Navigate to student dashboard
        navigate("/studentdashboard");
        return;
      }

      // 2) Try Faculty_Admin table
      const { data: facultyData, error: facultyError } = await supabase
        .from("Faculty_Admin")
        .select("*")
        .eq("Faculty_Qu_Email", email)
        .eq("Password", password)
        .single();

      if (facultyData) {
        console.log("Faculty/Admin logged in:", facultyData);

        // Save session info
        localStorage.setItem("userId", String(facultyData.Faculty_Id));
        localStorage.setItem("userType", "Faculty/Administrator");
        localStorage.setItem("userEmail", facultyData.Faculty_Qu_Email);

        resetForm();
        onClose();

        // Navigate to faculty/admin dashboard
        navigate("/facultyAdmin");
        return;
      }

      throw new Error("Invalid email or password");
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!showModal) return null;

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
          <div className="modal-header">
            <h5 className="modal-title">Sign In</h5>
            <button
              type="button"
              className="btn-close"
              onClick={handleClose}
            ></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Quinnipiac E-Mail</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              <div className="d-flex gap-2">
                <button
                  type="submit"
                  className="btn btn-dark flex-grow-1"
                  disabled={loading}
                >
                  {loading ? "Logging In..." : "Log In"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleClose}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
