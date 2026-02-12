// src/facultyDashboard.tsx
import React, { useState, type ChangeEvent, type FormEvent } from "react";
import Footer from "./footer";
import "./FacultyDashboard.css";
import "./StudentDashboard.css";
import Navbar from "./Navbar";
import CourseCard from "./components/CourseCard";

/* ---------- Types & Data from Student Dashboard ------------------------- */
type MajorOption =
  | "Software Engineering"
  | "Computer Science"
  | "Mechanical Engineering"
  | "Industrial Engineering";

interface ClassOption {
  id: string;
  label: string;
  courseId?: string;
}

const SOFTWARE_ENGINEERING_CLASSES: ClassOption[] = [
  { id: "1", label: "SER-491", courseId: "SER-491" },
  { id: "2", label: "SER-340", courseId: "SER-340" },
  { id: "3", label: "SER-341", courseId: "SER-341" },
  { id: "4", label: "SER-325", courseId: "SER-325" },
  { id: "5", label: "SER-350", courseId: "SER-350" },
  { id: "6", label: "SER-330", courseId: "SER-330" },
  { id: "7", label: "SER-210", courseId: "SER-210" },
  { id: "8", label: "SER-492", courseId: "SER-492" },
  { id: "9", label: "SER-225", courseId: "SER-225" },
  { id: "10", label: "SER-375", courseId: "SER-375" },
  { id: "11", label: "SER-120", courseId: "SER-120" },
  { id: "12", label: "SER-305", courseId: "SER-305" },
];

const MAJOR_CLASSES: Record<MajorOption, ClassOption[]> = {
  "Software Engineering": SOFTWARE_ENGINEERING_CLASSES,
  "Computer Science": [],
  "Mechanical Engineering": [],
  "Industrial Engineering": [],
};

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
  const [selectedMajor, setSelectedMajor] = useState<MajorOption>(
    "Software Engineering",
  );
  const [courseName, setCourseName] = useState("");
  const [courseSkills, setCourseSkills] = useState("");
  const [courseCompetencies, setCourseCompetencies] = useState("");

  const [courses, setCourses] = useState<Course[]>([]);

  /* ---------- Helpers ---------------------------------------------------*/
  // simple incremental id generator – works fine for a demo
  let nextId = Math.max(...courses.map((c) => c.id), 0) + 1;

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
    // Reset form
    setCourseName("");
    setCourseSkills("");
    setCourseCompetencies("");
  };

  const handleMajorChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedMajor(e.target.value as MajorOption);
    setCourseName(""); // Reset course selection when major changes
  };

  /* ---------- Render ---------------------------------------------------- */
  return (
    <div className="dashboard-page">
      <Navbar />
      {/* main content */}
      <main className="dashboard-main">
        {/* Title + subtitle */}
        <section className="dashboard-title-block">
          <h1 className="dashboard-title">Faculty Dashboard</h1>
          <p className="dashboard-subtitle">
            Manage course mappings and competencies.
          </p>
        </section>

        {/* ─────────────────────── Courses ─────────────────────── */}
        <section className="card-section">
          <div className="card-surface">
            <h2>Add Course Mapping</h2>
            <form onSubmit={addCourse} style={styles.form}>
              {/* Major Selection */}
              <div style={{ width: "100%" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "bold",
                  }}
                >
                  Select Major:
                </label>
                <select
                  className="textbox"
                  value={selectedMajor}
                  onChange={handleMajorChange}
                  style={styles.input}
                >
                  {Object.keys(MAJOR_CLASSES).map((major) => (
                    <option key={major} value={major}>
                      {major}
                    </option>
                  ))}
                </select>
              </div>

              {/* Course Selection (Radio Buttons) */}
              <div style={{ width: "100%", margin: "1rem 0" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "bold",
                  }}
                >
                  Select Course:
                </label>
                {MAJOR_CLASSES[selectedMajor].length > 0 ? (
                  <div className="class-grid">
                    {MAJOR_CLASSES[selectedMajor].map((c) => (
                      <label key={c.id} className="class-option">
                        <input
                          type="radio"
                          name="courseSelection"
                          value={c.label}
                          checked={courseName === c.label}
                          onChange={(e) => setCourseName(e.target.value)}
                        />
                        <span>{c.label}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted" style={{ fontStyle: "italic" }}>
                    No courses available for this major.
                  </p>
                )}
              </div>

              <textarea
                className="textbox"
                placeholder="Skills (e.g., React, SQL, Agile)"
                value={courseSkills}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setCourseSkills(e.target.value)
                }
                style={{ ...styles.input, height: 60 }}
              />
              <textarea
                className="textbox"
                placeholder="Competencies (e.g., Problem Solving, Teamwork)"
                value={courseCompetencies}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setCourseCompetencies(e.target.value)
                }
                style={{ ...styles.input, height: 60 }}
              />
              <button
                type="submit"
                style={{ ...styles.button, opacity: courseName ? 1 : 0.6 }}
                disabled={!courseName}
              >
                Add Course
              </button>
            </form>
          </div>
        </section>
        <section className="card-section">
          <div className="card-surface">
            {courses.length === 0 ? (
              <p style={{ textAlign: "center", color: "#666" }}>
                No courses added yet. Use the form above to map a course.
              </p>
            ) : (
              courses.map((c) => (
                <div key={c.id}>
                  <CourseCard
                    id={c.id}
                    name={c.name}
                    skills={[c.skills ?? ""]}
                    competencies={[c.competencies ?? ""]}
                    deleteMethod={() =>
                      setCourses((prev) =>
                        prev.filter((pc) => pc.name !== c.name),
                      )
                    }
                  />
                </div>
              ))
            )}
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
  form: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    width: "100%", // Take full width of container
  },

  input: {
    padding: 8,
    fontSize: 14,
    borderRadius: 4,
    border: "1px solid #ccc",
    width: "100%",
    boxSizing: "border-box",
  },
  button: {
    padding: "8px 16px",
    background: "#0069d9",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    marginTop: "10px",
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
