import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

interface LoginModalProps {
  showModal: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ showModal, onClose }) => {
  const navigate = useNavigate();
  // 'email' state now technically holds the 'username' part
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fullEmail = `${email}@quinnipiac.edu`;

    try {
      // We want to check both tables so that the user doesn't have to specify their type
      const { data: studentData, error: studentError } = await supabase
        .from("Student")
        .select("*")
        .eq("Student_Qu_Email", fullEmail)
        .eq("Password", password)
        .single();

      if (studentData) {
        console.log("Student logged in:", studentData);
        resetForm();
        onClose();
        // Navigate to student dashboard
        navigate("/studentdashboard");
        return;
      }

      // Now check the admin table
      const { data: facultyData, error: facultyError } = await supabase
        .from("Faculty_Admin")
        .select("*")
        .eq("Faculty_Qu_Email", fullEmail)
        .eq("Password", password)
        .single();

      if (facultyData) {
        console.log("Faculty/Admin logged in:", facultyData);
        resetForm();
        onClose();
        // Navigate to faculty dashboard or home
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
            <button
              type="button"
              className="btn-close"
              onClick={handleClose}
            ></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Quinnipiac E-Mail"
                  />
                  <span className="input-group-text" id="basic-addon2">
                    @quinnipiac.edu
                  </span>
                </div>
              </div>

              <div className="mb-3">
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Password"
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
