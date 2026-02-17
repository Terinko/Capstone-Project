import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, type SubmitHandler } from "react-hook-form";
import { supabase } from "../supabaseClient";
import { saveSession } from "./Session";

interface LoginModalProps {
  showModal: boolean;
  onClose: () => void;
}

interface ILoginInput {
  email: string;
  password: string;
}

const LoginModal: React.FC<LoginModalProps> = ({ showModal, onClose }) => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ILoginInput>();

  const onSubmit: SubmitHandler<ILoginInput> = async (data) => {
    setServerError("");
    setLoading(true);

    const fullEmail = `${data.email}@quinnipiac.edu`;

    try {
      // Check Student table
      const { data: studentData } = await supabase
        .from("Student")
        .select("*")
        .eq("Student_Qu_Email", fullEmail)
        .eq("Password", data.password)
        .single();

      if (studentData) {
        console.log("Student logged in:", studentData);

        saveSession({
          userId: studentData.Student_Id,
          userType: "Student",
          userEmail: studentData.Student_Qu_Email,
        });

        handleClose();
        navigate("/studentdashboard");
        return;
      }

      // Check Faculty/Admin table
      const { data: facultyData } = await supabase
        .from("Faculty_Admin")
        .select("*")
        .eq("Faculty_Qu_Email", fullEmail)
        .eq("Password", data.password)
        .single();

      if (facultyData) {
        console.log("Faculty/Admin logged in:", facultyData);

        saveSession({
          userId: facultyData.Faculty_Id,
          userType: "Faculty/Administrator",
          userEmail: facultyData.Faculty_Qu_Email,
        });

        handleClose();

        const isAdmin =
          facultyData.Faculty_Qu_Email?.toLowerCase() ===
          "sample.admin@quinnipiac.edu";

        if (isAdmin) {
          // Go to admin dashboard
          navigate("/adminDashboard");
        } else {
          navigate("/facultyAdmin");
        }
        return;
      }

      throw new Error("Invalid email or password");
    } catch (err: any) {
      setServerError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setServerError("");
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
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="mb-3">
                <div className="input-group">
                  <input
                    type="text"
                    className={`form-control ${errors.email ? "is-invalid" : ""}`}
                    placeholder="Quinnipiac E-Mail"
                    {...register("email", { required: "Email is required" })}
                  />
                  <span className="input-group-text" id="basic-addon2">
                    @quinnipiac.edu
                  </span>
                  {errors.email && (
                    <div className="invalid-feedback">
                      {errors.email.message}
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <input
                  type="password"
                  className={`form-control ${errors.password ? "is-invalid" : ""}`}
                  placeholder="Password"
                  {...register("password", {
                    required: "Password is required",
                  })}
                />
                {errors.password && (
                  <div className="invalid-feedback">
                    {errors.password.message}
                  </div>
                )}
              </div>

              {serverError && (
                <div className="alert alert-danger" role="alert">
                  {serverError}
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
