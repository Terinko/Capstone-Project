// src/pages/dashboard.tsx
import React, { useState, type ChangeEvent, type FormEvent } from "react";
import Footer from "./footer";
import "./FacultyDashboard.css";
import "./StudentDashboard.css";
import quLogo from "./assets/Q_logo.png";
import CourseCard from "./components/courseCard";

/* ---------- Types ------------------------------------------------------- */
interface Course {
  id: number;
  name: string;
  skills?: string;
  competencies?: string;
}

/* ---------- Component ---------------------------------------------------- */
const FacultyDashboard: React.FC = () => {
  /* ---------- State -----------------------------------------------------*/
  const [courseName, setCourseName] = useState("");
  const [courseSkills, setCourseSkills] = useState("");
  const [courseCompetencies, setCourseCompetencies] = useState("");

  const [courses, setCourses] = useState<Course[]>([]);

  /* ---------- Helpers ---------------------------------------------------*/
  // simple incremental id generator – works fine for a demo
  let nextId = Math.max(...courses.map((c) => c.id)) + 1;

  const addCourse = (e: FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) return;
    setCourses((prev) => [
      ...prev,
      {
        id: nextId++,
        name: courseName.trim(),
        skills: courseSkills.trim(),
        competencies: courseCompetencies.trim(),
      },
    ]);
    setCourseName("");
    setCourseSkills("");
    setCourseCompetencies("");
  };

  /* ---------- Render ---------------------------------------------------- */
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

        {/* ─────────────────────── Courses ─────────────────────── */}
        <section className="card-section">
          <div className="card-surface">
            <h2>Courses</h2>
            <form onSubmit={addCourse} style={styles.form}>
              <input
                className="textbox"
                type="text"
                placeholder="Course name"
                value={courseName}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setCourseName(e.target.value)
                }
                required
                style={styles.input}
              />
              <textarea
                className="textbox"
                placeholder="Skills"
                value={courseSkills}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setCourseSkills(e.target.value)
                }
                style={{ ...styles.input, height: 60 }}
              />
              <textarea
                className="textbox"
                placeholder="Competencies"
                value={courseCompetencies}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setCourseCompetencies(e.target.value)
                }
                style={{ ...styles.input, height: 60 }}
              />
              <button type="submit" style={styles.button}>
                Add Course
              </button>
            </form>
          </div>
        </section>
        <section className="card-section">
          <div className="card-surface">
            {courses.map((c) => (
              <div>
                <CourseCard id={c.id} name={c.name} skills={[c.skills ?? ""]} competencies={[c.competencies ?? ""]} deleteMethod={
                  () => setCourses((prev) =>
                    prev.filter((pc) => pc.name !== c.name)
                  )
                }/>
              </div>
            ))}
          </div>
        </section>
      </main>
      {/* Footer */}
      <Footer />
    </div>
  );
};

/* ---------- Inline CSS ---------------------------------------------- */
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 900,
    margin: "0 auto",
    padding: 20,
    fontFamily: "Arial, sans-serif",
  },
  header: { textAlign: "center", color: "#333" },

  section: {
    marginBottom: 40,
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 20,
    background: "#f9f9f9",
  },
  form: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },

  input: {
    padding: 8,
    fontSize: 14,
    borderRadius: 4,
    border: "1px solid #ccc",
    width: "100%",
  },
  button: {
    padding: "6px 12px",
    background: "#0069d9",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },

  list: { marginTop: 20, listStyle: "none", paddingLeft: 0 },
  listItem: {
    padding: "8px 12px",
    marginBottom: 6,
    background: "#fff",
    borderRadius: 4,
    border: "1px solid #ddd",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  deleteButton: {
    padding: "2px 8px",
    fontSize: 12,
    background: "#dc3545",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
};

export default FacultyDashboard;
