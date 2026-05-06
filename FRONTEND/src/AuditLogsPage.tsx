/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./footer";
import { loadSession } from "./Session";
import { apiClient } from "./services/apiClient";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import "./AuditLogsPage.css"; // Added import for our new CSS

interface AuditLog {
  id: number;
  created_at: string;
  email: string;
  user_type: string;
  action: string;
}

const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [sliderValue, setSliderValue] = useState<[number, number] | null>(null);
  const [filterRange, setFilterRange] = useState<[number, number] | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const session = loadSession();
    // Check for "Admin" instead of "Administrator" based on your DB
    if (
      !session ||
      (session.userType !== "Administrator" && session.userType !== "Admin")
    ) {
      navigate("/");
      return;
    }

    const fetchLogs = async () => {
      try {
        setLoading(true);
        const data = await apiClient<AuditLog[]>("/api/audit-logs");
        setLogs(data);
      } catch (err: unknown) {
        setError("Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [navigate]);

  // Compute min/max dates
  const { minDate, maxDate } = useMemo(() => {
    if (logs.length === 0) {
      const now = Date.now();
      return { minDate: now, maxDate: now + 86400000 };
    }

    const times = logs.map((l) => new Date(l.created_at).getTime());
    const min = Math.min(...times);
    let max = Math.max(...times);

    if (min === max) {
      max += 86400000;
    }

    return { minDate: min, maxDate: max };
  }, [logs]);

  // Initialize slider once logs load
  useEffect(() => {
    if (logs.length && !sliderValue) {
      setSliderValue([minDate, maxDate]);
      setFilterRange([minDate, maxDate]);
    }
  }, [logs, minDate, maxDate, sliderValue]);

  // Filtering
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const logTime = new Date(log.created_at).getTime();

      const roleMatch =
        roleFilter === "All" ||
        (log.user_type &&
          log.user_type.toLowerCase() === roleFilter.toLowerCase());

      const dateMatch =
        !filterRange ||
        (logTime >= filterRange[0] && logTime <= filterRange[1]);

      return roleMatch && dateMatch;
    });
  }, [logs, roleFilter, filterRange]);

  const handleExport = async () => {
    try {
      const session = loadSession();
      const API_BASE =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

      const params = new URLSearchParams();
      if (roleFilter !== "All") params.append("role", roleFilter);

      if (filterRange) {
        const startString = new Date(filterRange[0])
          .toISOString()
          .split("T")[0];
        const endString = new Date(filterRange[1]).toISOString().split("T")[0];
        params.append("startDate", startString);
        params.append("endDate", endString);
      }

      const res = await fetch(
        `${API_BASE}/api/audit-logs/export?${params.toString()}`,
        {
          headers: {
            ...(session?.token && { Authorization: `Bearer ${session.token}` }),
          },
        },
      );

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `system_audit_logs_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export error:", e);
    }
  };

  return (
    <div className="admin-dashboard">
      <Navbar />

      <div className="admin-content">
        <section className="admin-header">
          <h1 className="admin-title">Audit Logs</h1>
        </section>

        <section className="admin-filter-bar audit-filter-bar">
          <div className="audit-filter-controls">
            <div className="audit-role-wrapper">
              <span className="filter-icon" aria-hidden="true">
                <i className="bi bi-funnel"></i>
              </span>

              <div className="filter-inline">
                <label className="filter-label" htmlFor="roleFilter">
                  User Role:
                </label>
                <select
                  id="roleFilter"
                  className="filter-select"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="All">All Roles</option>
                  <option value="Admin">Admin</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Student">Student</option>
                </select>
              </div>
            </div>

            {sliderValue && (
              <div className="filter-inline audit-slider-wrapper">
                <label className="filter-label slider-label">Date Range:</label>
                <div className="slider-container">
                  <Slider
                    range
                    trackStyle={{ backgroundColor: "#418fde" }}
                    handleStyle={{ borderColor: "#418fde" }}
                    min={minDate}
                    max={maxDate}
                    value={sliderValue}
                    onChange={(value) =>
                      setSliderValue(value as [number, number])
                    }
                    onChangeComplete={(value) =>
                      setFilterRange(value as [number, number])
                    }
                  />
                  <div className="muted slider-dates">
                    <span>{new Date(sliderValue[0]).toLocaleDateString()}</span>
                    <span>{new Date(sliderValue[1]).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="audit-export-wrapper">
            <button
              type="button"
              className="btn-export-audit"
              onClick={handleExport}
              disabled={filteredLogs.length === 0}
            >
              <i className="bi bi-download"></i> Export CSV
            </button>
          </div>
        </section>

        {loading && (
          <section className="admin-table-card">
            <div className="muted" style={{ padding: 16 }}>
              Loading audit logs…
            </div>
          </section>
        )}

        {error && (
          <section className="admin-table-card">
            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 8 }}>Couldn't load audit logs.</div>
              <div className="muted">{error}</div>
            </div>
          </section>
        )}

        {!loading && !error && (
          <section className="admin-table-card">
            <div className="admin-table">
              <div className="admin-table-row admin-table-header audit-table-row">
                <div className="admin-cell log-col-time">Timestamp</div>
                <div className="admin-cell log-col-user">User</div>
                <div className="admin-cell log-col-role">Role</div>
                <div className="admin-cell log-col-action">Action</div>
              </div>

              {filteredLogs.map((log) => (
                <div className="admin-table-row audit-table-row" key={log.id}>
                  <div className="admin-cell log-col-time">
                    {new Date(log.created_at).toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>

                  <div className="admin-cell log-col-user">
                    <div className="log-email" title={log.email}>
                      {log.email}
                    </div>
                  </div>

                  <div className="admin-cell log-col-role">{log.user_type}</div>

                  <div className="admin-cell log-col-action" title={log.action}>
                    {log.action}
                  </div>
                </div>
              ))}

              {filteredLogs.length === 0 && (
                <div className="admin-table-row admin-empty-row">
                  <div className="admin-cell log-col-empty">
                    <span className="muted">
                      No audit logs found matching these filters.
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

export default AuditLogsPage;
