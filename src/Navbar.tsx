import React from "react";
import "./Navbar.css";
import quLogo from "./assets/Qyellow_logo.png";

const Navbar: React.FC = () => {
  return (
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
            <button className="nav-btn">Profile</button>
          </li>
          <li className="nav-item">
            <button className="nav-btn">Sign Out</button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
