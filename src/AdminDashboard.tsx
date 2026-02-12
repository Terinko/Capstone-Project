import React, { useEffect, useMemo, useState } from "react";
import Footer from "./footer";
import Navbar from "./Navbar";
import "./AdminDashboard.css";
import { loadSession } from "./Session";
import EditCourseMappingModal from "./EditCourseMappingModal";

/**
 * Majors supported by the dashboard filter.
 * Keeping this as a union helps prevent typos and ensures the dropdown stays in sync with the backend contract.
 */
type MajorFilter =
  | "Software Engineering"
  | "Computer Science"
  | "Mechanical Engineering"
  | "Industrial Engineering"
  | "Civil Engineering"
  | "Engineering";

/**
 * A course row is either fully mapped or not.
 * "Mapped" means both Skill + Competency mappings exist based on backend rules.
 */
type CompletionStatus = "Mapped" | "Unmapped";

/**
 * Filter control values for mapping completion.
 */
type CompletionFilter = "All" | "Mapped" | "Unmapped";

/**
 * Row model expected from the API for the table.
 * - skills: skill *descriptions*
 * - competencies: competency *names*
 */
interface AdminCourseRow {
  id: number;
  course: string;
  major: MajorFilter;
  completion: CompletionStatus;
  skills: string[];
  competencies: string[];
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE) {
  // Fail fast during development instead of silently making requests to "undefined".
  throw new Error("VITE_API_BASE_URL is not defined");
}

/**
 * Thin wrapper around fetch that:
 * 1) Prepends the API base URL
 * 2) Adds JSON headers
 * 3) Adds session headers if logged in
 * 4) Throws a useful error when requests fail
 *
 * Centralizing this makes every API call consistent and easier to debug.
 */
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const session = loadSession();

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      // Session headers are used by your backend for authorization
      ...(session && {
        "x-user-id": String(session.userId),
        "x-user-type": session.userType,
      }),
      // Allow callers to override/extend headers if needed
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    // Capture body to make debugging backend failures easier (e.g. RLS errors, route mismatches, etc.)
    const text = await res.text();
    console.error("API ERROR:", {
      url: `${API_BASE}${path}`,
      status: res.status,
      body: text,
    });

    // Throw body text if present (often contains a JSON error message)
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

const AdminDashboard: React.FC = () => {
  /* ------------------------------ Filters ------------------------------ */
  const [majorFilter, setMajorFilter] = useState<MajorFilter>(
    "Software Engineering",
  );
  const [completionFilter, setCompletionFilter] =
    useState<CompletionFilter>("All");

  /* ------------------------------ Table state ------------------------------ */
  const [rows, setRows] = useState<AdminCourseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * When set, the modal opens and knows which course is being edited.
   * Using a single object keeps the state together and avoids desync.
   */
  const [editing, setEditing] = useState<{ id: number; code: string } | null>(
    null,
  );

  /**
   * Incrementing refreshKey triggers a re-fetch.
   * This is a simple, reliable pattern after saving edits in the modal.
   */
  const [refreshKey, setRefreshKey] = useState(0);

  /**
   * Fetch course rows when:
   * - the selected major changes
   * - the completion filter changes
   * - we explicitly refresh after saving
   *
   * Uses a cancellation flag to prevent setting state after unmount / rapid changes.
   */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Query params are built here to keep the fetch URL clean and predictable.
        const params = new URLSearchParams();
        params.set("major", majorFilter);
        params.set("status", completionFilter);

        const data = await apiFetch<AdminCourseRow[]>(
          `/api/admin/courses?${params.toString()}`,
        );

        if (!cancelled) setRows(data);
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
  }, [majorFilter, completionFilter, refreshKey]);

  /**
   * If the user changes filters while the edit modal is open,
   * close the modal to avoid editing a row that may no longer be visible/valid.
   */
  useEffect(() => {
    setEditing(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [majorFilter, completionFilter]);

  /**
   * Placeholder for future client-side filtering/sorting without reworking render logic.
   * Right now rows are already filtered server-side based on major/status.
   */
  const filteredRows = useMemo(() => rows, [rows]);

  return (
    <div className="admin-dashboard">
      <Navbar />

      <div className="admin-content">
        {/* ------------------------------ Header ------------------------------ */}
        <section className="admin-header">
          <h1 className="admin-title">Admin Dashboard</h1>
          <p className="admin-subtitle">Everything you need, in one place.</p>
        </section>

        {/* ------------------------------ Filters ------------------------------ */}
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
                <option value="Engineering">Engineering</option>
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

        {/* ------------------------------ Loading / Error States ------------------------------ */}
        {loading && (
          <section className="admin-table-card">
            <div className="muted" style={{ padding: 16 }}>
              Loading courses…
            </div>
          </section>
        )}

        {error && (
          <section className="admin-table-card">
            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 8 }}>Couldn’t load courses.</div>
              <div className="muted">{error}</div>
            </div>
          </section>
        )}

        {/* ------------------------------ Main Table ------------------------------ */}
        {!loading && !error && (
          <section className="admin-table-card">
            <div className="admin-table">
              {/* Table header row */}
              <div className="admin-table-row admin-table-header">
                <div className="admin-cell admin-cell-course">Course</div>
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
                  </div>

                  {/* Skills display: show descriptions, or a helpful empty state */}
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

                  {/* Competencies + edit button */}
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

                      {/* Opens a single shared modal with the selected course context */}
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

              {/* One modal instance: controlled by editing state */}
              <EditCourseMappingModal
                isOpen={editing !== null}
                courseId={editing?.id ?? 0}
                courseCode={editing?.code ?? ""}
                onClose={() => setEditing(null)}
                // Trigger a refetch after saving to keep the table accurate
                onSaved={() => setRefreshKey((k) => k + 1)}
                apiFetch={apiFetch}
              />

              {/* Empty table message */}
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
        )}
      </div>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
