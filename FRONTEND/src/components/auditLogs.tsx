import React, { useState, useEffect } from "react";
import { loadSession } from "../Session";

interface AuditLog {
  id: number;
  user_id: number;
  email: string;
  user_type: string;
  action: "LOGIN" | "LOGOUT";
  created_at: string;
}

const AuditLogsSection: React.FC = () => {
  const [isAuditSectionOpen, setIsAuditSectionOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState("all");

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (timeFilter !== "all") {
      const date = new Date();
      if (timeFilter === "today") {
        date.setHours(0, 0, 0, 0);
      } else if (timeFilter === "7days") {
        date.setDate(date.getDate() - 7);
      } else if (timeFilter === "30days") {
        date.setDate(date.getDate() - 30);
      }
      params.append("startDate", date.toISOString());
    }
    return params.toString() ? `?${params.toString()}` : "";
  };

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    setError(null);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
      const session = loadSession();
      const queryString = buildQueryParams();

      const response = await fetch(`${API_BASE}/api/audit-logs${queryString}`, {
        headers: {
          Authorization: `Bearer ${session?.token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setAuditLogs(data);
      } else {
        setAuditLogs([]);
        console.warn("Audit logs returned non-array data:", data);
      }
    } catch (err) {
      console.error("Error fetching audit logs:", err);
      setError("Unable to load audit logs at this time.");
    } finally {
      setLoadingAudit(false);
    }
  };

  const exportToCSV = async () => {
    setError(null);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
      const session = loadSession();
      const queryString = buildQueryParams();

      const response = await fetch(
        `${API_BASE}/api/audit-logs/export${queryString}`,
        {
          headers: {
            Authorization: `Bearer ${session?.token}`,
          },
        },
      );

      if (!response.ok) throw new Error("Failed to export audit logs");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `system_audit_logs_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error exporting audit logs:", err);
      setError("Unable to export audit logs.");
    }
  };

  useEffect(() => {
    if (isAuditSectionOpen) {
      fetchAuditLogs();
    }
  }, [isAuditSectionOpen, timeFilter]);

  return (
    <>
      <style>{`
        .al-card {
          background-color: #ffffff;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          margin-bottom: 1.5rem;
          overflow: hidden;
          font-family: inherit;
        }
        .al-btn {
          width: 100%;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: #ffffff;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .al-btn:hover { background-color: #f9fafb; }
        .al-btn:focus { outline: none; }
        .al-flex-center {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .al-avatar {
          width: 2rem;
          height: 2rem;
          border-radius: 0.5rem;
          background-color: #eef2ff;
          color: #4f46e5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }
        .al-text-left { text-align: left; }
        .al-title {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }
        .al-subtitle {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0.125rem 0 0 0;
        }
        .al-content {
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
          background-color: #f8fafc;
        }
        .al-content-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .al-content-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }
        .al-controls-wrap {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .al-select {
          padding: 0.375rem 2rem 0.375rem 0.75rem;
          border-radius: 0.375rem;
          border: 1px solid #d1d5db;
          font-size: 0.875rem;
          background-color: white;
          color: #374151;
          cursor: pointer;
        }
        .al-export {
          font-size: 0.875rem;
          color: #10b981;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          background: none;
          border: none;
          cursor: pointer;
        }
        .al-export:hover { color: #059669; }
        .al-refresh {
          font-size: 0.875rem;
          color: #4f46e5;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          background: none;
          border: none;
          cursor: pointer;
        }
        .al-refresh:hover { color: #3730a3; }
        .al-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
        .al-table-wrap {
          background-color: #ffffff;
          overflow-x: auto;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        .al-table {
          width: 100%;
          min-width: 100%;
          border-collapse: collapse;
        }
        .al-table th {
          padding: 0.75rem 1.5rem;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }
        .al-table td {
          padding: 1rem 1.5rem;
          white-space: nowrap;
          font-size: 0.875rem;
          border-bottom: 1px solid #e5e7eb;
          text-align: left;
        }
        .al-table tr:hover { background-color: #f9fafb; }
        .al-table tr:last-child td { border-bottom: none; }
        .al-text-primary { color: #111827; font-weight: 500; }
        .al-text-secondary { color: #6b7280; font-size: 0.75rem; margin-top: 0.125rem; }
        .al-badge {
          padding: 0.25rem 0.625rem;
          display: inline-flex;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 9999px;
          align-items: center;
        }
        .al-badge-admin { background-color: #f3e8ff; color: #7e22ce; }
        .al-badge-faculty { background-color: #dbeafe; color: #1d4ed8; }
        .al-badge-student { background-color: #d1fae5; color: #047857; }
        .al-badge-login { background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; border-radius: 0.375rem; }
        .al-badge-logout { background-color: #fffbeb; color: #b45309; border: 1px solid #fde68a; border-radius: 0.375rem; }
        .al-error {
          padding: 0.75rem;
          background-color: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }
        .al-empty {
          padding: 3rem 1.5rem;
          text-align: center;
          color: #6b7280;
          font-size: 0.875rem;
        }
        .al-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <section className="al-card">
        <button
          onClick={() => setIsAuditSectionOpen(!isAuditSectionOpen)}
          className="al-btn"
        >
          <div className="al-flex-center">
            <div className="al-text-left">
              <h2 className="al-title">System Audit Logs</h2>
              <p className="al-subtitle">
                Track user login and logout activity for security compliance
              </p>
            </div>
          </div>
          {isAuditSectionOpen ? (
            <i
              className="bi bi-chevron-up"
              style={{ color: "#9ca3af", fontSize: "1.25rem" }}
            ></i>
          ) : (
            <i
              className="bi bi-chevron-down"
              style={{ color: "#9ca3af", fontSize: "1.25rem" }}
            ></i>
          )}
        </button>

        {isAuditSectionOpen && (
          <div className="al-content">
            <div className="al-content-header">
              <h3 className="al-content-title">Recent Activity</h3>
              <div className="al-controls-wrap">
                <select
                  className="al-select"
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </select>

                <button onClick={exportToCSV} className="al-export">
                  <i className="bi bi-download"></i>
                  Export CSV
                </button>

                <button
                  onClick={fetchAuditLogs}
                  disabled={loadingAudit}
                  className="al-refresh"
                >
                  <i
                    className={`bi bi-arrow-clockwise ${
                      loadingAudit ? "al-spin" : ""
                    }`}
                  ></i>
                  Refresh
                </button>
              </div>
            </div>

            {error && <div className="al-error">{error}</div>}

            <div className="al-table-wrap">
              <table className="al-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingAudit ? (
                    <tr>
                      <td colSpan={4}>
                        <div
                          className="al-empty al-flex-center"
                          style={{
                            justifyContent: "center",
                            flexDirection: "column",
                          }}
                        >
                          <i
                            className="bi bi-arrow-clockwise al-spin"
                            style={{
                              fontSize: "1.5rem",
                              marginBottom: "0.5rem",
                            }}
                          ></i>
                          <span>Loading audit logs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="al-empty">
                        No audit activity found for this time period.
                      </td>
                    </tr>
                  ) : (
                    Array.isArray(auditLogs) &&
                    auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ color: "#4b5563" }}>
                          {new Date(log.created_at).toLocaleString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td>
                          <div className="al-text-primary">{log.email}</div>
                          <div className="al-text-secondary">
                            ID: {log.user_id}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`al-badge ${
                              log.user_type === "ADMIN"
                                ? "al-badge-admin"
                                : log.user_type === "FACULTY"
                                  ? "al-badge-faculty"
                                  : "al-badge-student"
                            }`}
                          >
                            {log.user_type}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`al-badge ${
                              log.user_type && log.action === "LOGIN"
                                ? "al-badge-login"
                                : "al-badge-logout"
                            }`}
                          >
                            {log.action === "LOGIN" ? (
                              <i
                                className="bi bi-box-arrow-in-right"
                                style={{ marginRight: "0.375rem" }}
                              ></i>
                            ) : (
                              <i
                                className="bi bi-box-arrow-right"
                                style={{ marginRight: "0.375rem" }}
                              ></i>
                            )}
                            {log.action}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </>
  );
};

export default AuditLogsSection;
