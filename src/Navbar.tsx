import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Navbar.css";
import quLogo from "./assets/Qyellow_logo.png";
import EditAccountModal from "./EditAccountModal";
import { loadSession, clearSession } from "./Session";

const Navbar: React.FC = () => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const session = loadSession();
    setUserType(session?.userType ?? null);
  }, []);

  const handleProfileClick = () => {
    if (userType) {
      setShowEditModal(true);
    } else {
      console.warn("No session found; cannot open EditAccountModal.");
    }
  };

  const handleSignOut = () => {
    clearSession();
    setUserType(null);
    navigate("/");
  };

  return (
    <>
      <nav className="app-navbar navbar navbar-expand-lg px-4">
        <a className="navbar-brand d-flex align-items-center">
          <img
            src={quLogo}
            alt="Quinnipiac University logo"
            className="navbar-logo"
          />
        </a>

        <button
          className="navbar-toggler custom-toggle"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarContent"
          aria-controls="navbarContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarContent">
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <button className="nav-btn" onClick={handleProfileClick}>
                Profile
              </button>
            </li>
            <li className="nav-item">
              <button className="nav-btn" onClick={handleSignOut}>
                Log Out
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {showEditModal && userType && (
        <EditAccountModal
          showModal={showEditModal}
          onClose={() => setShowEditModal(false)}
          userType={userType as "Student" | "Faculty/Administrator"}
        />
      )}
    </>
  );
};

export default Navbar;
