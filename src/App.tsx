import React, { useState } from "react";
import CreateAccountModal from "./CreateAccountModal";
import LoginModal from "./LoginModal";
import "./LandingPage.css";

const App: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <div className="landing-page bg-light min-vh-100 d-flex flex-column">
      <header className="hero-section d-flex align-items-center justify-content-center">
        <div className="text-center px-3">
          <h1 className="hero-title fw-bold text-white mb-0">
            Welcome to the Quinnipiac <br />
            Resume Builder
          </h1>
        </div>
      </header>
      <main className="flex-grow-1">
        <section className="container-fluid py-5 main-section-center">
          <div className="content-wrapper text-center">
            <h2 className="h3 fw-bold mb-2">
              Add High Quality Talking Points To Your Resume
            </h2>

            <p className="text-muted mb-4" style={{ maxWidth: "38rem" }}>
              Use previously taken classes and prior work experience to map your
              academic skills to career-ready and technical skills for your
              resume in minutes!
            </p>

            <div className="cta-buttons">
              <button
                type="button"
                className="btn btn-dark px-4 py-2"
                onClick={() => setShowLoginModal(true)}
              >
                Log In
              </button>

              <button
                type="button"
                className="btn btn-outline-dark px-4 py-2"
                onClick={() => setShowCreateModal(true)}
              >
                Create Account
              </button>
            </div>
          </div>
        </section>
        <section className="container-fluid pb-5">
          <div className="content-wrapper text-center">
            <h2 className="h3 fw-bold mb-1">Testimonials</h2>
            <p className="text-muted mb-4">
              What students and teachers have to say about our product
            </p>

            <div className="row g-4">
              <div className="col-md-6">
                <article className="card shadow-sm border-0 h-100 rounded-4">
                  <div className="card-body">
                    <div className="d-flex align-items-center mb-3">
                      <div className="avatar-circle me-3 bg-success-subtle text-success">
                        C
                      </div>
                      <div>
                        <h3 className="h6 mb-0">Connor O'Connell</h3>
                        <small className="text-muted">
                          Machanical Engineering Student
                        </small>
                      </div>
                    </div>
                    <p className="mb-0">
                      I always struggled to describe my experience
                      professionally. This skills generator translated my
                      coursework into clear, career-ready statements. I used it
                      to apply for internships and immediately started getting
                      more responses.
                    </p>
                  </div>
                </article>
              </div>

              <div className="col-md-6">
                <article className="card shadow-sm border-0 h-100 rounded-4">
                  <div className="card-body">
                    <div className="d-flex align-items-center mb-3">
                      <div className="avatar-circle me-3 bg-danger-subtle text-danger">
                        T
                      </div>
                      <div>
                        <h3 className="h6 mb-0">Tyler Bryant</h3>
                        <small className="text-muted">
                          Computer Science Student
                        </small>
                      </div>
                    </div>
                    <p className="mb-0">
                      This tool helped me finally understand how to turn my
                      class projects into real skills employers care about. My
                      resume went from a list of assignments to something that
                      actually shows what I can do.
                    </p>
                  </div>
                </article>
              </div>
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
