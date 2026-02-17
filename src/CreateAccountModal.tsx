import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, type SubmitHandler } from "react-hook-form";
import { supabase } from "../supabaseClient";
import { saveSession } from "./Session";

interface CreateAccountModalProps {
  showModal: boolean;
  onClose: () => void;
}

interface IFormInput {
  userType: "Student" | "Faculty/Administrator";
  firstName: string;
  lastName: string;
  email: string;
  major?: string;
  password: string;
  confirmPassword: string;
}

const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  showModal,
  onClose,
}) => {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const AUTOFACULTY = false;

  // Initialize React Hook Form
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<IFormInput>({
    defaultValues: {
      userType: "Student",
      email: "",
      firstName: "",
      lastName: "",
      major: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Watch userType to conditionally render/validate the Major field
  const userType = watch("userType");
  // Watch password to validate confirmPassword against it
  const password = watch("password");

  const onSubmit: SubmitHandler<IFormInput> = async (data) => {
    setServerError("");
    setLoading(true);

    try {
      if (data.userType === "Student") {
        const { data: existingUser } = await supabase
          .from("Student")
          .select("*")
          .eq("Student_Qu_Email", data.email + "@quinnipiac.edu")
          .single();

        if (existingUser) {
          throw new Error("An account with this email already exists");
        }

        const { data: newData, error } = await supabase
          .from("Student")
          .insert({
            Student_Qu_Email: data.email + "@quinnipiac.edu",
            Password: data.password,
            FirstName: data.firstName,
            LastName: data.lastName,
            Major: data.major,
          })
          .select()
          .single();

        if (error) throw error;

        console.log("Student account created:", newData);

        saveSession({
          userId: newData.Student_Id,
          userType: "Student",
          userEmail: newData.Student_Qu_Email,
        });

        handleClose();
        navigate("/studentdashboard");
      } else {
        const { data: existingUser } = await supabase
          .from("Faculty_Admin")
          .select("*")
          .eq("Faculty_Qu_Email", data.email + "@quinnipiac.edu")
          .single();

        if (existingUser) {
          throw new Error("An account with this email already exists");
        }

        const { data: newData, error } = await supabase
          .from("Faculty_Admin")
          .insert({
            Type: AUTOFACULTY,
            Faculty_Qu_Email: data.email + "@quinnipiac.edu",
            Password: data.password,
            FirstName: data.firstName,
            LastName: data.lastName,
          })
          .select()
          .single();

        if (error) throw error;

        console.log("Faculty/Admin account created:", newData);

        saveSession({
          userId: newData.Faculty_Id,
          userType: "Faculty/Administrator",
          userEmail: newData.Faculty_Qu_Email,
        });

        handleClose();
        navigate("/facultyAdmin");
      }
    } catch (err: any) {
      setServerError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset(); // Clear form errors and values
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
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="mb-3">
                <select className="form-select" {...register("userType")}>
                  <option value="Student">Student</option>
                  <option value="Faculty/Administrator">
                    Faculty/Administrator
                  </option>
                </select>
              </div>

              <div className="mb-3">
                <input
                  type="text"
                  className={`form-control ${errors.firstName ? "is-invalid" : ""}`}
                  placeholder="First Name..."
                  {...register("firstName", {
                    required: "First Name is required",
                  })}
                />
                {errors.firstName && (
                  <div className="invalid-feedback">
                    {errors.firstName.message}
                  </div>
                )}
              </div>

              <div className="mb-3">
                <input
                  type="text"
                  className={`form-control ${errors.lastName ? "is-invalid" : ""}`}
                  placeholder="Last Name..."
                  {...register("lastName", {
                    required: "Last Name is required",
                  })}
                />
                {errors.lastName && (
                  <div className="invalid-feedback">
                    {errors.lastName.message}
                  </div>
                )}
              </div>

              {userType === "Student" && (
                <div className="mb-3">
                  <input
                    type="text"
                    className={`form-control ${errors.major ? "is-invalid" : ""}`}
                    placeholder="Major"
                    {...register("major", {
                      required:
                        userType === "Student" ? "Major is required" : false,
                    })}
                  />
                  {errors.major && (
                    <div className="invalid-feedback">
                      {errors.major.message}
                    </div>
                  )}
                </div>
              )}

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
                    minLength: {
                      value: 6,
                      message: "Password must be at least 6 characters",
                    },
                  })}
                />
                {errors.password && (
                  <div className="invalid-feedback">
                    {errors.password.message}
                  </div>
                )}
              </div>

              <div className="mb-3">
                <input
                  type="password"
                  className={`form-control ${errors.confirmPassword ? "is-invalid" : ""}`}
                  placeholder="Confirm Password"
                  {...register("confirmPassword", {
                    required: "Please confirm your password",
                    validate: (val) =>
                      val === password || "Passwords do not match",
                  })}
                />
                {errors.confirmPassword && (
                  <div className="invalid-feedback">
                    {errors.confirmPassword.message}
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
