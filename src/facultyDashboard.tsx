import React, { useState } from "react";
import "./StudentDashboard.css";
import quLogo from "./assets/Q_logo.png";

// Define types for majors and classes
type MajorOption =
  | "Software Engineering"
  | "Computer Science"
  | "Mechanical Engineering"
  | "Industrial Engineering";

interface ClassOption {
  id: string;
  label: string;
  skills: string[];
}

const SOFTWARE_ENGINEERING_CLASSES: ClassOption[] = [
  {
    id: "1",
    label: "SER 491",
    skills: [
      "Developed full stack web applications using modern frameworks.",
      "Collaborated in Agile teams to plan, implement, and review features.",
      "Applied software design principles to build maintainable code.",
      "Used version control (Git) and code reviews in a team setting.",
    ],
  },
  { id: "2", label: "SER 340", skills: [] },
  { id: "3", label: "SER 341", skills: [] },
  { id: "4", label: "SER 325", skills: [] },
  { id: "5", label: "SER 350", skills: [] },
  { id: "6", label: "SER 330", skills: [] },
  { id: "7", label: "SER 210", skills: [] },
  { id: "8", label: "SER 492", skills: [] },
  { id: "9", label: "SER 225", skills: [] },
  { id: "10", label: "SER 375", skills: [] },
  { id: "11", label: "SER 120", skills: [] },
  { id: "12", label: "SER 305", skills: [] },
];

// Map majors to their respective classes
const MAJOR_CLASSES: Record<MajorOption, ClassOption[]> = {
  "Software Engineering": SOFTWARE_ENGINEERING_CLASSES,
  "Computer Science": [],
  "Mechanical Engineering": [],
  "Industrial Engineering": [],
};

//Selected major and classes state management
const StudentDashboard: React.FC = () => {
  const [major, setMajor] = useState<MajorOption>("Software Engineering");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [bullets, setBullets] = useState<string[]>([]);

  const availableClasses = MAJOR_CLASSES[major];

  // Toggle class selection
  const handleClassToggle = (id: string) => {
    setSelectedClasses((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Generate bullet points based on selected classes
  const handleGenerate = () => {
    // No class data configured for this major yet
    if (!availableClasses || availableClasses.length === 0) {
      setBullets([
        `Class-based bullet points for ${major} are coming soon.`,
        "For now, try selecting Software Engineering to see an example.",
      ]);
      return;
    }

    if (selectedClasses.length === 0) {
      setBullets(["Select at least one class to generate bullet points."]);
      return;
    }

    // Collect skills from selected classes
    const selectedClassObjects = availableClasses.filter((c) =>
      selectedClasses.includes(c.id)
    );
    const collectedSkills = selectedClassObjects.flatMap((c) => c.skills);

    if (collectedSkills.length === 0) {
      // No skills mapped yet for these specific classes
      setBullets(["No skills have been mapped yet for the selected classes."]);
      return;
    }

    setBullets(collectedSkills);
  };

  // Download bullet points as a text file
  const handleDownload = () => {
    const text = bullets.join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "generated-bullet-points.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard-page">
      {/* NavBar */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm px-4">
        <a className="navbar-brand d-flex align-items-center">
          <img
            src={quLogo}
            alt="Quinnipiac University logo"
            height={50}
            width={45}
            style={{ display: "block" }}
          />
        </a>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent"
          aria-controls="navbarSupportedContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <button className="btn btn-link nav-link">Profile</button>
            </li>
            <li className="nav-item">
              <button className="btn btn-link nav-link">Sign Out</button>
            </li>
          </ul>
        </div>
      </nav>

      {/* main content */}
      <main className="dashboard-main">
        {/* Title + subtitle */}
        <section className="dashboard-title-block">
          <h1 className="dashboard-title">Faculty Dashboard</h1>
          <p className="dashboard-subtitle">
            Everything you need, in one place.
          </p>
        </section>

        {/* Build schedule */}
        <section className="card-section">
          <div className="card-surface">
            <h2 className="card-title">Build Your Schedule</h2>

            {/* Select major */}
            <div className="card-row">
              <label className="field-label" htmlFor="major-select">
                Select Major:
              </label>
              <div className="major-row">
                <select
                  id="major-select"
                  className="major-select"
                  value={major}
                  onChange={(e) => {
                    const newMajor = e.target.value as MajorOption;
                    setMajor(newMajor);
                    setSelectedClasses([]); // reset class selections when major changes
                  }}
                >
                  <option value="Software Engineering">
                    Software Engineering
                  </option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Mechanical Engineering">
                    Mechanical Engineering
                  </option>
                  <option value="Industrial Engineering">
                    Industrial Engineering
                  </option>
                </select>
              </div>
            </div>

            {/* Class grid */}
            <div className="card-row">
              <span className="field-label">Select Classes:</span>

              {availableClasses && availableClasses.length > 0 ? (
                <div className="class-grid">
                  {availableClasses.map((c) => (
                    <label key={c.id} className="class-option">
                      <input
                        type="checkbox"
                        checked={selectedClasses.includes(c.id)}
                        onChange={() => handleClassToggle(c.id)}
                      />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p
                  className="text-muted"
                  style={{ marginTop: "0.3rem", fontSize: "0.85rem" }}
                >
                  Class selection will be available for this major soon. Try
                  Software Engineering to see an example.
                </p>
              )}
            </div>

            {/* Generate button */}
            <div className="generate-row">
              <button
                type="button"
                className="btn-generate"
                onClick={handleGenerate}
              >
                Generate
              </button>
            </div>
          </div>
        </section>

        {/* Generated bullet points */}
        <section className="card-section">
          <div className="card-surface bullets-card">
            <div className="bullets-header">
              <h2 className="card-title">Generated Bullet Points:</h2>
              <button
                type="button"
                className="btn btn-link p-0"
                onClick={handleDownload}
                aria-label="Download bullet points"
              >
                <i
                  className="bi bi-download"
                  style={{ fontSize: "1.25rem" }}
                ></i>
              </button>
            </div>

            <div className="bullets-body">
              {bullets.length === 0 ? (
                <p className="placeholder-text">
                  Bullet points will appear here after you generate them.
                </p>
              ) : (
                <ul>
                  {bullets.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <span>Quinnipiac Resume Services</span>
        <button type="button" className="footer-link">
          Learn More
        </button>
      </footer>
    </div>
  );
};

export default StudentDashboard;
