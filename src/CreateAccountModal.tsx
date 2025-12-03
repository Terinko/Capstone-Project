import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { saveSession } from "./Session";

interface CreateAccountModalProps {
  showModal: boolean;
  onClose: () => void;
}

const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  showModal,
  onClose,
}) => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState<string>("Student");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [major, setMajor] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const AUTOFACULTY = false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      if (userType === "Student") {
        const { data: existingUser } = await supabase
          .from("Student")
          .select("*")
          .eq("Student_Qu_Email", email + "@quinnipiac.edu")
          .single();

        if (existingUser) {
          throw new Error("An account with this email already exists");
        }

        const { data, error } = await supabase
          .from("Student")
          .insert({
            Student_Qu_Email: email + "@quinnipiac.edu",
            Password: password,
            FirstName: firstName,
            LastName: lastName,
            Major: major,
          })
          .select()
          .single();

        if (error) throw error;

        console.log("Student account created:", data);
        // alert("Student account created successfully!");

        saveSession({
          userId: data.Student_Id,
          userType: "Student",
          userEmail: data.Student_Qu_Email,
        });

        resetForm();
        onClose();
        navigate("/studentdashboard");
      } else {
        const { data: existingUser } = await supabase
          .from("Faculty_Admin")
          .select("*")
          .eq("Faculty_Qu_Email", email + "@quinnipiac.edu")
          .single();

        if (existingUser) {
          throw new Error("An account with this email already exists");
        }

        const { data, error } = await supabase
          .from("Faculty_Admin")
          .insert({
            Type: AUTOFACULTY,
            Faculty_Qu_Email: email + "@quinnipiac.edu",
            Password: password,
            FirstName: firstName,
            LastName: lastName,
          })
          .select()
          .single();

        if (error) throw error;

        console.log("Faculty/Admin account created:", data);
        // alert("Faculty/Administrator account created successfully!");

        saveSession({
          userId: data.Faculty_Id,
          userType: "Faculty/Administrator",
          userEmail: data.Faculty_Qu_Email,
        });

        resetForm();
        onClose();
        navigate("/facultyAdmin");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUserType("Student");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFirstName("");
    setLastName("");
    setMajor("");
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
        className="modal-dialog modal-dialog-centered modal-dialog-scrollable"
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
                <select
                  className="form-select"
                  value={userType}
                  onChange={(e) => setUserType(e.target.value)}
                  required
                >
                  <option value="Student">Student</option>
                  <option value="Faculty/Administrator">
                    Faculty/Administrator
                  </option>
                </select>
              </div>

              <div className="mb-3">
                <input
                  type="text"
                  className="form-control"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  placeholder="First Name..."
                />
              </div>

              <div className="mb-3">
                <input
                  type="text"
                  className="form-control"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  placeholder="Last Name..."
                />
              </div>

              {userType === "Student" && (
                <div className="mb-3">
                  <input
                    type="text"
                    className="form-control"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    required
                    placeholder="Major"
                  />
                </div>
              )}

              <div className="mb-3">
                <div className="input-group">
                  <input
                    type="email"
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

              <div className="mb-3">
                <input
                  type="password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm Password"
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
                  {loading ? "Creating Account..." : "Create Account"}
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

export default CreateAccountModal;
