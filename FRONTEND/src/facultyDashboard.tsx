// src/facultyDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import Footer from "./footer";
import Navbar from "./Navbar";
import "./FacultyDashboard.css";
import EditCourseMappingModal from "./EditCourseMappingModal";
import { loadSession, clearSession } from "./Session";

// ─── Types ────────────────────────────────────────────────────────────────────

type CompletionStatus = "Mapped" | "Unmapped";
type CompletionFilter = "All" | "Mapped" | "Unmapped";

interface FacultyCourseRow {
  id: number;
  course: string;
  altName: string | null;
  major: string;
  professor: string;
  completion: CompletionStatus;
  skills: string[];
  competencies: string[];
}

// ─── API helper (mirrors AdminDashboard exactly) ──────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE) {
  throw new Error("VITE_API_BASE_URL is not defined");
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const session = loadSession();

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(session && { Authorization: `Bearer ${session.token}` }),
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401) {
    clearSession();
    window.location.href = "/";
    throw new Error("Session expired, please log in again");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

// ─── Component ────────────────────────────────────────────────────────────────

const FacultyDashboard: React.FC = () => {
  // ── Filters ───────────────────────────────────────────────────────────────
  const [completionFilter, setCompletionFilter] =
    useState<CompletionFilter>("All");
  const [majorFilter, setMajorFilter] = useState<string>("");

  // ── Table state ───────────────────────────────────────────────────────────
  const [rows, setRows] = useState<FacultyCourseRow[]>([]);
  const [unassignedRows, setUnassignedRows] = useState<FacultyCourseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Unassigned table toggle ───────────────────────────────────────────────
  const [unassignedOpen, setUnassignedOpen] = useState(false);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [editing, setEditing] = useState<{ id: number; code: string } | null>(
    null,
  );

  // ── Fetch faculty's courses and unassigned courses in parallel ────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("status", completionFilter);

        const [data, unassigned] = await Promise.all([
          apiFetch<FacultyCourseRow[]>(
            `/api/faculty/courses?${params.toString()}`,
          ),
          apiFetch<FacultyCourseRow[]>(
            `/api/faculty/unassigned-courses?${params.toString()}`,
          ),
        ]);

        if (!cancelled) {
          setRows(data);
          setUnassignedRows(unassigned);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load courses");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [completionFilter, refreshKey]);

  // Close modal when filter changes
  useEffect(() => {
    setEditing(null);
  }, [completionFilter, majorFilter]);

  // Derive available majors from both row sets combined
  const availableMajors = useMemo(
    () => [...new Set([...rows, ...unassignedRows].map((r) => r.major))].sort(),
    [rows, unassignedRows],
  );

  // Apply major filter client-side to both tables
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (majorFilter && r.major !== majorFilter) return false;
      return true;
    });
  }, [rows, majorFilter]);

  const filteredUnassignedRows = useMemo(() => {
    return unassignedRows.filter((r) => {
      if (majorFilter && r.major !== majorFilter) return false;
      return true;
    });
  }, [unassignedRows, majorFilter]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="admin-dashboard">
      <Navbar />

      <div className="admin-content">
        <section className="admin-header">
          <h1 className="admin-title">Faculty Dashboard</h1>
          <p className="admin-subtitle">Manage your course mappings.</p>
        </section>

        {/* Filter bar */}
        <section className="admin-filter-bar">
          <div className="filter-left">
            <span className="filter-icon" aria-hidden="true">
              <i className="bi bi-funnel"></i>
            </span>

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

            <div className="filter-inline">
              <label className="filter-label" htmlFor="major-select">
                Major:
              </label>
              <select
                id="major-select"
                className="filter-select"
                value={majorFilter}
                onChange={(e) => setMajorFilter(e.target.value)}
              >
                <option value="">All</option>
                {availableMajors.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Loading */}
        {loading && (
          <section className="admin-table-card">
            <div className="muted" style={{ padding: 16 }}>
              Loading courses…
            </div>
          </section>
        )}

        {/* Error */}
        {error && (
          <section className="admin-table-card">
            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 8 }}>Couldn't load courses.</div>
              <div className="muted">{error}</div>
            </div>
          </section>
        )}

        {/* Table */}
        {!loading && !error && (
          <section className="admin-table-card">
            <div className="admin-table">
              {/* Header row */}
              <div className="admin-table-row admin-table-header">
                <div className="admin-cell admin-cell-course">Course</div>
                <div className="admin-cell admin-cell-professor">Professor</div>
                <div className="admin-cell admin-cell-skills">Skills</div>
                <div className="admin-cell admin-cell-competencies">
                  Competencies
                </div>
              </div>

              {/* Data rows */}
              {filteredRows.map((row) => (
                <div className="admin-table-row" key={row.id}>
                  <div className="admin-cell admin-cell-course">
                    {row.course}
                    {row.altName && (
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "#64748b",
                          marginTop: 2,
                        }}
                      >
                        {row.altName}
                      </div>
                    )}
                  </div>
                  <div className="admin-cell admin-cell-professor">
                    {row.professor ? (
                      row.professor
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </div>
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
                        <span className="muted">
                          No competencies mapped yet
                        </span>
                      )}
                      <button
                        type="button"
                        className="edit-icon-button"
                        aria-label={`Edit mapping for ${row.course}`}
                        onClick={() =>
                          setEditing({ id: row.id, code: row.course })
                        }
                      >
                        <i className="bi bi-pencil-square"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Modal — searches both row sets for the editing row */}
              <EditCourseMappingModal
                isOpen={editing !== null}
                courseId={editing?.id ?? 0}
                courseCode={editing?.code ?? ""}
                professor={
                  editing
                    ? ([...rows, ...unassignedRows].find(
                        (r) => r.id === editing.id,
                      )?.professor ?? "")
                    : ""
                }
                major={
                  editing
                    ? ([...rows, ...unassignedRows].find(
                        (r) => r.id === editing.id,
                      )?.major ?? "")
                    : ""
                }
                onClose={() => setEditing(null)}
                onSaved={() => setRefreshKey((k) => k + 1)}
                apiFetch={apiFetch}
                mappingBasePath="/api/faculty"
              />

              {/* Empty state */}
              {filteredRows.length === 0 && (
                <div className="admin-table-row admin-empty-row">
                  <div className="admin-cell" style={{ gridColumn: "1 / 5" }}>
                    <span className="muted">
                      No courses match the selected filter.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Unassigned Courses (collapsible) ── */}
        {!loading && !error && (
          <section className="admin-table-card" style={{ marginTop: 16 }}>
            {/* Toggle header */}
            <button
              type="button"
              onClick={() => setUnassignedOpen((o) => !o)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  color: "#1e293b",
                  fontSize: "0.95rem",
                }}
              >
                Unassigned Courses
                {filteredUnassignedRows.length > 0 && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      background: "#f1f5f9",
                      color: "#64748b",
                      padding: "2px 8px",
                      borderRadius: 999,
                    }}
                  >
                    {filteredUnassignedRows.length}
                  </span>
                )}
              </span>
              <i
                className={`bi bi-chevron-${unassignedOpen ? "up" : "down"}`}
                style={{ color: "#94a3b8", fontSize: "0.85rem" }}
              />
            </button>

            {/* Table — rendered when open, data always fetched */}
            {unassignedOpen && (
              <div
                className="admin-table"
                style={{ borderTop: "1px solid #e2e8f0" }}
              >
                <div className="admin-table-row admin-table-header">
                  <div className="admin-cell admin-cell-course">Course</div>
                  <div className="admin-cell admin-cell-professor">
                    Professor
                  </div>
                  <div className="admin-cell admin-cell-skills">Skills</div>
                  <div className="admin-cell admin-cell-competencies">
                    Competencies
                  </div>
                </div>

                {filteredUnassignedRows.map((row) => (
                  <div className="admin-table-row" key={row.id}>
                    <div className="admin-cell admin-cell-course">
                      {row.course}
                      {row.altName && (
                        <div
                          style={{
                            fontSize: "0.78rem",
                            color: "#64748b",
                            marginTop: 2,
                          }}
                        >
                          {row.altName}
                        </div>
                      )}
                    </div>
                    <div className="admin-cell admin-cell-professor">
                      <span className="muted">—</span>
                    </div>
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
                          <span className="muted">
                            No competencies mapped yet
                          </span>
                        )}
                        <button
                          type="button"
                          className="edit-icon-button"
                          aria-label={`Edit mapping for ${row.course}`}
                          onClick={() =>
                            setEditing({ id: row.id, code: row.course })
                          }
                        >
                          <i className="bi bi-pencil-square"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredUnassignedRows.length === 0 && (
                  <div className="admin-table-row admin-empty-row">
                    <div className="admin-cell" style={{ gridColumn: "1 / 5" }}>
                      <span className="muted">
                        No unassigned courses match the selected filter.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default FacultyDashboard;
