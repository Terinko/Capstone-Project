import React, { useMemo, useState } from "react";
import Footer from "./footer";
import Navbar from "./Navbar";
import "./AdminDashboard.css";

type MajorFilter =
  | "Software Engineering"
  | "Computer Science"
  | "Mechanical Engineering"
  | "Industrial Engineering"
  | "Civil Engineering";

type CompletionStatus = "Mapped" | "Unmapped"; // internal status

type CompletionFilter = "All" | "Mapped" | "Unmapped";

interface AdminCourseRow {
  id: number;
  course: string;
  major: MajorFilter;
  completion: CompletionStatus;
  skills: string[];
  competencies: string[];
}

const MOCK_ROWS: AdminCourseRow[] = [
  {
    id: 1,
    course: "SER 210",
    major: "Software Engineering",
    completion: "Mapped",
    skills: ["Skill 1", "Skill 2", "Skill 3"],
    competencies: ["Competency 1", "Competency 2", "Competency 3"],
  },
  {
    id: 2,
    course: "SER 350",
    major: "Software Engineering",
    completion: "Mapped",
    skills: ["Skill 1", "Skill 2", "Skill 3"],
    competencies: ["Competency 1", "Competency 2", "Competency 3"],
  },
  {
    id: 3,
    course: "SER 491",
    major: "Software Engineering",
    completion: "Unmapped",
    skills: ["Skill 1", "Skill 2"],
    competencies: [],
  },
  {
    id: 4,
    course: "CS 200",
    major: "Computer Science",
    completion: "Unmapped",
    skills: [],
    competencies: [],
  },
  {
    id: 5,
    course: "ME 220",
    major: "Mechanical Engineering",
    completion: "Mapped",
    skills: ["Skill 1"],
    competencies: ["Competency 1", "Competency 2"],
  },
];

const AdminDashboard: React.FC = () => {
  const [majorFilter, setMajorFilter] = useState<MajorFilter>(
    "Software Engineering"
  );
  const [completionFilter, setCompletionFilter] =
    useState<CompletionFilter>("All");

  // Filter the mock data (later this will be DB-driven)
  const filteredRows = useMemo(() => {
    return MOCK_ROWS.filter((row) => {
      const matchesMajor = row.major === majorFilter;
      const matchesCompletion =
        completionFilter === "All" || row.completion === completionFilter;
      return matchesMajor && matchesCompletion;
    });
  }, [majorFilter, completionFilter]);

  return (
    <div className="admin-dashboard">
      <Navbar />
      <div className="admin-content">
        {/* Title & subtitle */}
        <section className="admin-header">
          <h1 className="admin-title">Admin Dashboard</h1>
          <p className="admin-subtitle">Everything you need, in one place.</p>
        </section>

        {/* Filter row */}
        <section className="admin-filter-bar">
          <div className="filter-left">
            <span className="filter-icon" aria-hidden="true">
              <i className="bi bi-funnel"></i>
            </span>

            <div className="filter-inline">
              <label className="filter-label" htmlFor="major-select">
                Select Major:
              </label>
              <select
                id="major-select"
                className="filter-select"
                value={majorFilter}
                onChange={(e) => setMajorFilter(e.target.value as MajorFilter)}
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
                <option value="Civil Engineering">Civil Engineering</option>
              </select>
            </div>

            <div className="filter-inline">
              <label className="filter-label" htmlFor="completion-select">
                Completion:
              </label>
              <select
                id="completion-select"
                className="filter-select"
                value={completionFilter}
                onChange={(e) =>
                  setCompletionFilter(e.target.value as CompletionFilter)
                }
              >
                <option value="All">All</option>
                <option value="Mapped">Mapped</option>
                <option value="Unmapped">Unmapped</option>
              </select>
            </div>
          </div>
        </section>

        {/* Table card */}
        <section className="admin-table-card">
          <div className="admin-table">
            {/* Header row */}
            <div className="admin-table-row admin-table-header">
              <div className="admin-cell admin-cell-course">Course</div>
              <div className="admin-cell admin-cell-skills">Skills</div>
              <div className="admin-cell admin-cell-competencies">
                Competencies
              </div>
            </div>

            {/* Body rows */}
            {filteredRows.map((row) => (
              <div className="admin-table-row" key={row.id}>
                <div className="admin-cell admin-cell-course">{row.course}</div>

                <div className="admin-cell admin-cell-skills">
                  {row.skills.length > 0 ? (
                    <ul>
                      {row.skills.map((skill, idx) => (
                        <li key={idx}>{skill}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="muted">No skills mapped yet</span>
                  )}
                </div>

                <div className="admin-cell admin-cell-competencies">
                  <div className="competency-content">
                    {row.competencies.length > 0 ? (
                      <ul>
                        {row.competencies.map((c, idx) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="muted">No competencies mapped yet</span>
                    )}

                    {/* Edit icon – visual placeholder for future modal or page */}
                    <button
                      type="button"
                      className="edit-icon-button"
                      aria-label={`Edit mapping for ${row.course}`}
                    >
                      <i className="bi bi-pencil-square"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredRows.length === 0 && (
              <div className="admin-table-row admin-empty-row">
                <div className="admin-cell" style={{ gridColumn: "1 / 4" }}>
                  <span className="muted">
                    No courses match the selected filters.
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
