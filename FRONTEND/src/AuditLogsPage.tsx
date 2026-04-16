/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./footer";
import { loadSession } from "./Session";
import { apiClient } from "./services/apiClient";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

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

        <section
          className="admin-filter-bar"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "32px",
              flexWrap: "wrap",
              flex: 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                className="filter-icon"
                aria-hidden="true"
                style={{ marginRight: "4px" }}
              >
                <i className="bi bi-funnel"></i>
              </span>

              <div className="filter-inline" style={{ margin: 0 }}>
                <label
                  className="filter-label"
                  htmlFor="roleFilter"
                  style={{ marginRight: "8px" }}
                >
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
              <div
                className="filter-inline"
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "400px",
                  margin: 0,
                }}
              >
                <label
                  className="filter-label"
                  style={{ minWidth: "90px", marginRight: "16px" }}
                >
                  Date Range:
                </label>
                <div style={{ flex: 1 }}>
                  <Slider
                    range
                    trackStyle={{ backgroundColor: '#418fde' }}
                    handleStyle={{
                      borderColor: '#418fde'
                    }}
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
                  <div
                    className="muted"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "8px",
                      fontSize: "0.8rem",
                    }}
                  >
                    <span>{new Date(sliderValue[0]).toLocaleDateString()}</span>
                    <span>{new Date(sliderValue[1]).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              className="btn-export"
              onClick={handleExport}
              disabled={filteredLogs.length === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                backgroundColor: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                cursor: filteredLogs.length === 0 ? "not-allowed" : "pointer",
                opacity: filteredLogs.length === 0 ? 0.6 : 1,
              }}
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
              <div className="admin-table-row admin-table-header">
                {/* Applied minWidth: 0 to all cells to enforce layout proportions */}
                <div
                  className="admin-cell"
                  style={{ flex: "0 0 180px", minWidth: 0 }}
                >
                  Timestamp
                </div>
                <div className="admin-cell" style={{ flex: "1", minWidth: 0 }}>
                  User
                </div>
                <div
                  className="admin-cell"
                  style={{ flex: "0 0 130px", minWidth: 0 }}
                >
                  Role
                </div>
                <div
                  className="admin-cell"
                  style={{ flex: "1.5", minWidth: 0 }}
                >
                  Action
                </div>
              </div>

              {filteredLogs.map((log) => (
                <div className="admin-table-row" key={log.id}>
                  <div
                    className="admin-cell"
                    style={{
                      flex: "0 0 180px",
                      minWidth: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {new Date(log.created_at).toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>

                  <div
                    className="admin-cell"
                    style={{ flex: "1", minWidth: 0, overflow: "hidden" }}
                  >
                    {/* Ellipsis added to email and user ID. Title attribute shows full text on hover. */}
                    <div
                      className="course-code"
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        width: "100%",
                      }}
                      title={log.email}
                    >
                      {log.email}
                    </div>
                    <div
                      className="muted"
                      style={{
                        fontSize: "0.85rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        width: "100%",
                      }}
                    ></div>
                  </div>

                  <div
                    className="admin-cell"
                    style={{ flex: "0 0 130px", minWidth: 0 }}
                  >
                    {log.user_type}
                  </div>

                  <div
                    className="admin-cell"
                    style={{
                      flex: "1.5",
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={log.action}
                  >
                    {log.action}
                  </div>
                </div>
              ))}

              {filteredLogs.length === 0 && (
                <div className="admin-table-row admin-empty-row">
                  <div
                    className="admin-cell"
                    style={{ gridColumn: "1 / -1", justifyContent: "center" }}
                  >
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
