import React, { useEffect, useState } from "react";
import "./Navbar.css";
import quLogo from "./assets/Qyellow_logo.png";
import EditAccountModal from "./EditAccountModal";

type UserType = "Student" | "Faculty/Administrator";

const Navbar: React.FC = () => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [userType, setUserType] = useState<UserType | null>(null);

  // Read user info from localStorage once on mount
  useEffect(() => {
    const storedId = localStorage.getItem("userId");
    const storedType = localStorage.getItem("userType") as UserType | null;

    if (storedId) {
      setUserId(Number(storedId));
    }
    if (storedType === "Student" || storedType === "Faculty/Administrator") {
      setUserType(storedType);
    }
  }, []);

  const handleProfileClick = () => {
    // Only open modal if we know who the user is
    if (userId && userType) {
      setShowEditModal(true);
    } else {
      console.warn("No userId/userType found; cannot open EditAccountModal.");
    }
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
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
              <button className="nav-btn">Sign Out</button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Modal lives here, controlled entirely by Navbar */}
      {showEditModal && userId !== null && userType && (
        <EditAccountModal
          showModal={showEditModal}
          onClose={handleCloseModal}
          userType={userType}
          userId={userId}
        />
      )}
    </>
  );
};

export default Navbar;
