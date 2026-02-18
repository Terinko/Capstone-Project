// src/facultyDashboard.tsx
import React, {
  useState,
  useEffect,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Footer from "./footer";
import "./FacultyDashboard.css";
import "./StudentDashboard.css";
import Navbar from "./Navbar";
import CourseCard from "./components/CourseCard";

/* ---------- Types & Data from Student Dashboard ------------------------- */
type MajorOption = string; // Relaxed type to allow dynamic DB values

interface ClassOption {
  id: string;
  label: string;
  courseId?: string;
}

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
  const [majorClasses, setMajorClasses] = useState<Record<
    string,
    ClassOption[]
  > | null>(null);

  /* ---------- Helpers ---------------------------------------------------*/
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

  // FIX: Wrap fetch in useEffect to prevent infinite loops
  useEffect(() => {
    const fetchMajorClasses = async () => {
      try {
        const response = await fetch("http://localhost:3001/courses");
        const result = await response.json();
        setMajorClasses(result);

        // Optional: If the currently selected major isn't in the fetched list, select the first one
        const keys = Object.keys(result);
        if (keys.length > 0 && !keys.includes(selectedMajor)) {
          setSelectedMajor(keys[0]);
        }
      } catch (err) {
        console.error("Failed to fetch majors:", err);
      }
    };

    fetchMajorClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

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
                {majorClasses ? (
                  <select
                    className="textbox"
                    value={selectedMajor}
                    onChange={handleMajorChange}
                    style={styles.input}
                  >
                    {Object.keys(majorClasses).map((major) => (
                      <option key={major} value={major}>
                        {major}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-muted">Loading majors...</p>
                )}
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
                {majorClasses &&
                majorClasses[selectedMajor] &&
                majorClasses[selectedMajor].length > 0 ? (
                  <div className="class-grid">
                    {majorClasses[selectedMajor].map((c) => (
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
    width: "100%",
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
};

export default FacultyDashboard;
