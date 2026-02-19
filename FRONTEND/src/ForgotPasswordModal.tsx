import React, { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";

interface ForgotPasswordProps {
  showModal: boolean;
  onClose: () => void;
}

interface IForgotPasswordInput {
  email: string;
}

const ForgotPasswordModal: React.FC<ForgotPasswordProps> = ({
  showModal,
  onClose,
}) => {
  const {
    handleSubmit,
    formState: { errors },
  } = useForm<IForgotPasswordInput>();

  const onSubmit: SubmitHandler<IForgotPasswordInput> = async (data) => {
    console.log(data);
  }

  const handleClose = () => {
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
          </div>
          <div className="modal-body">
            <h3>Forgot Password</h3>
            <p>Please type in the email so we can send you a recovery code:</p>
            <form onSubmit={handleSubmit(onSubmit)}>
              <input
                type="text"
                className={`form-control ${errors.email ? "is-invalid" : ""}`}
                placeholder="Quinnipiac E-Mail"
              />
              <br/>
              <div className="d-flex gap-2">
                <button
                  type="submit"
                  className="btn btn-dark flex-grow-1"
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
