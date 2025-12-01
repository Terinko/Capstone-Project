import React, { useState } from "react";
import CreateAccountModal from "./CreateAccountModal";
import LoginModal from "./LoginModal";
import "./LandingPage.css";
import nameLogo from "./assets/name_logo.png";

const App: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <div className="landing-page bg-light min-vh-100 d-flex flex-column">
      {/* hero: gradient background + logo */}
      <header className="hero-section d-flex align-items-center justify-content-center">
        <img
          src={nameLogo}
          alt="Quinnipiac Bobcats logo"
          className="hero-logo img-fluid"
        />
      </header>

      {/* main content */}
      <main className="flex-grow-1">
        <section className="container-fluid py-5 main-section-center">
          <div className="content-wrapper text-center">
            <h1 className="display-4 fw-bold mb-3 text-color-primary">
              Welcome to the Quinnipiac Resume Builder
            </h1>

            <h2 className="h4 fw-semibold mb-2 text-color-primary">
              Add High Quality Talking Points To Your Resume
            </h2>

            <p
              className="text-muted mb-4"
              style={{ maxWidth: "38rem", margin: "0 auto" }}
            >
              Use previously taken classes and prior work experience to map your
              academic skills to career-ready and technical skills for your
              resume in minutes!
            </p>

            <div className="cta-buttons">
              <button
                type="button"
                className="buttons me-3 px-4 py-2"
                onClick={() => setShowLoginModal(true)}
              >
                Log In
              </button>

              <button
                type="button"
                className="buttons px-4 py-2"
                onClick={() => setShowCreateModal(true)}
              >
                Create Account
              </button>
            </div>
          </div>
        </section>
      </main>

      <LoginModal
        showModal={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      <CreateAccountModal
        showModal={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
};

export default App;
