import React, { useEffect, useMemo, useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import "./EditCourseMappingModal.css";
import { searchAutofill } from "./Autofill";

/**
 * Represents a Skill or Competency option returned from the backend.
 * - Skills and Competencies both use Skill_name
 */
type Option = {
  Skill_Id: number;
  Skill_name: string;
  Type: boolean;
  majorMatch?: boolean;
};

/**
 * Response shape for the skills / competencies dropdown options.
 */
type SkillsOptionsResponse = {
  skills: Option[];
  competencies: Option[];
};

/**
 * Existing mappings for a course.
 * Skills and competencies are returned as names.
 */
type CourseMappingResponse = {
  skills: string[];
  competencies: string[];
};

/**
 * Props required to render and operate the modal.
 * apiFetch is injected so auth + headers are centralized elsewhere.
 */
type Props = {
  isOpen: boolean;
  courseId: number;
  courseCode: string;
  professor: string;
  major: string;
  onClose: () => void;
  onSaved: () => void;
  apiFetch: <T>(path: string, init?: RequestInit) => Promise<T>;
  /** Base path for course mapping endpoints. Defaults to /api/admin */
  mappingBasePath?: string;
  isAdmin: boolean;
};

type Professor = {
  Faculty_Id: number;
  FirstName: string;
  LastName: string;
}

export default function EditCourseMappingModal({
  isOpen,
  courseId,
  courseCode,
  professor,
  major,
  onClose,
  onSaved,
  apiFetch,
  mappingBasePath = "/api/admin",
  isAdmin,
}: Props) {
  /* -------------------- UI state -------------------- */
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [professorFilter, setProfessorFilter] = useState<string>(
    "N/A",
  );
  const [availableProfessors, setAvailableProfessors] = useState<Professor[]>([]);

  /* -------------------- Data state -------------------- */
  const [options, setOptions] = useState<SkillsOptionsResponse | null>(null);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [selectedCompetencyIds, setSelectedCompetencyIds] = useState<number[]>(
    [],
  );

  /* -------------------- Form state -------------------- */
  const [newProfessorName, setNewProfessorName] = useState("");
  const [newSkillName, setNewSkillName] = useState("");
  const [competencySearch, setCompetencySearch] = useState("");
  const [pendingSkillNames, setPendingSkillNames] = useState<string[]>([]);

  /**
   * Load available skills/competencies and current course mappings
   * whenever the modal opens or the course changes.
   */
  useEffect(() => {
    if (!isOpen) return;

    setNewProfessorName(professor);
    setPendingSkillNames([]);

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch options + existing mapping in parallel
        const [opts, mapping] = await Promise.all([
          apiFetch<SkillsOptionsResponse>(
            `/api/autofill/skills-dataset?scope=all&major=${encodeURIComponent(major)}`,
          ),
          apiFetch<CourseMappingResponse>(
            `${mappingBasePath}/courses/${courseId}/mapping`,
          ),
        ]);

        if (cancelled) return;

        setOptions(opts);

        // Convert returned names into IDs for checkbox state
        const skillIds = mapping.skills
          .map(
            (name) => opts.skills.find((s) => s.Skill_name === name)?.Skill_Id,
          )
          .filter((id): id is number => !!id);

        const competencyIds = mapping.competencies
          .map(
            (name) =>
              opts.competencies.find((c) => c.Skill_name === name)?.Skill_Id,
          )
          .filter((id): id is number => !!id);

        setSelectedSkillIds([...new Set(skillIds)]);
        setSelectedCompetencyIds([...new Set(competencyIds)]);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load course mapping");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, courseId, major, apiFetch]);

  useEffect(() => {
    const fetchMajors = async () => {
      try {
        const data = await apiFetch<Record<string, Professor>>("/api/admin/faculty");
        const professors = Object.values(data);
        setAvailableProfessors(professors);
      } catch (e) {
        console.error("Failed to load majors list:", e);
      }
    };
    fetchMajors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Resolve selected skill IDs into displayable text.
   * Memoized to avoid unnecessary recalculation on re-render.
   */
  const assignedSkills = useMemo(() => {
    if (!options) return [];

    const skillMap = new Map(options.skills.map((s) => [s.Skill_Id, s]));

    return selectedSkillIds
      .map((id) => {
        const skill = skillMap.get(id);
        return skill ? { id, name: skill.Skill_name } : null;
      })
      .filter(Boolean) as { id: number; name: string }[];
  }, [options, selectedSkillIds]);

  const skillSuggestions = useMemo(() => {
    if (!options) return [];

    const dataset = {
      scope: "all" as const,
      major: major ? { id: 0, name: major } : null,
      skills: options.skills.map((s) => ({
        ...s,
        majorMatch: !!s.majorMatch,
      })),
      competencies: options.competencies.map((c) => ({
        ...c,
        majorMatch: !!c.majorMatch,
      })),
    };

    const selected = new Set(selectedSkillIds);
    const pending = new Set(
      pendingSkillNames.map((n) => n.trim().toLowerCase()),
    );

    return searchAutofill(dataset, newSkillName, {
      type: "skill",
      limit: 5,
      majorOnly: false,
    }).filter((s) => {
      const name = s.Skill_name.trim().toLowerCase();
      if (selected.has(s.Skill_Id)) return false;
      if (pending.has(name)) return false;
      return true;
    });
  }, [options, major, newSkillName, selectedSkillIds, pendingSkillNames]);
  /**
   * Create a new Skill using the provided description.
   * If the backend reports it already exists, reuse it.
   */
  function normalizeName(s: string) {
    return s.trim().toLowerCase();
  }

  /**
   * "Create Skill" now stages locally.
   * - If it already exists in options, we just select its ID
   * - Otherwise we add its NAME to pendingSkillNames (not in DB yet)
   */
  function handleCreateSkill() {
    const raw = newSkillName;
    const name = raw.trim();
    if (!name) return;

    setError(null);

    const norm = normalizeName(name);

    // If it already exists in the Skills options list, select it
    const existing = options?.skills.find(
      (s) => normalizeName(s.Skill_name) === norm,
    );

    if (existing) {
      setSelectedSkillIds((prev) => [...new Set([...prev, existing.Skill_Id])]);
      setNewSkillName("");
      return;
    }

    // Otherwise, stage it locally (avoid duplicates)
    setPendingSkillNames((prev) => {
      const prevNorms = new Set(prev.map(normalizeName));
      if (prevNorms.has(norm)) return prev;
      return [...prev, name];
    });

    setNewSkillName("");
  }

  function handleDeleteProfessor() {
    if (!isAdmin) return;

    setNewProfessorName("N/A");
  }
  /**
   * Permanently delete a skill from the system.
   * Confirmation is required because this affects all courses.
   */
  async function handleDeleteSkill(skillId: number) {
    // Remove the skill from THIS course mapping only.
    // The Skills table should never be deleted from.
    setSelectedSkillIds((prev) => prev.filter((id) => id !== skillId));
  }

  /**
   * Persist selected skill + competency mappings for this course.
   */
  async function handleSave() {
    try {
      setSaving(true);
      setError(null);

      // 1) Create any pending skills in the DB *now* (on Save)
      let newSkillIds: number[] = [];

      if (pendingSkillNames.length > 0) {
        setCreating(true);

        for (const name of pendingSkillNames) {
          const norm = name.trim().toLowerCase();

          // If options now contains it (edge case), reuse
          const existing = options?.skills.find(
            (s) => s.Skill_name.trim().toLowerCase() === norm,
          );
          if (existing) {
            newSkillIds.push(existing.Skill_Id);
            continue;
          }

          try {
            const created = await apiFetch<Option>(
              `${mappingBasePath}/skills/resolve`,
              {
                method: "POST",
                body: JSON.stringify({
                  name,
                  major,
                }),
              },
            );
            newSkillIds.push(created.Skill_Id);
          } catch (e: any) {
            // If backend returns "already exists", reuse that Skill_Id
            try {
              const parsed = JSON.parse(e.message);
              if (parsed?.existing?.Skill_Id) {
                newSkillIds.push(parsed.existing.Skill_Id);
                continue;
              }
              throw e;
            } catch {
              throw e;
            }
          }
        }

        setCreating(false);
      }

      const mergedSkillIds = Array.from(
        new Set([...selectedSkillIds, ...newSkillIds]),
      );

      // 2) Update the mapping
      await apiFetch(`${mappingBasePath}/courses/${courseId}/mapping`, {
        method: "PUT",
        body: JSON.stringify({
          skillIds: mergedSkillIds,
          competencyIds: selectedCompetencyIds,
        }),
      });
      if (isAdmin) {
        await apiFetch(`${mappingBasePath}/courses/${courseId}`, {
          method: "PUT",
          body: JSON.stringify({
            professor: newProfessorName,
          }),
        });
      }

      setPendingSkillNames([]);
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  const filteredCompetencies =
    options?.competencies.filter((c) =>
      c.Skill_name.toLowerCase().includes(competencySearch.toLowerCase()),
    ) ?? [];

  return (
    <div className="edit-modal-backdrop" role="dialog" aria-modal="true">
      <div className="edit-modal">
        {/* ---------- Header ---------- */}
        <div className="edit-modal-header">
          <div>
            <h2>Edit Course Mapping</h2>
            <span className="edit-modal-subtitle">{courseCode}</span>
          </div>
          <button
            className="edit-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* ---------- Body ---------- */}
        <div className="edit-modal-body">
          {error && <div className="edit-modal-error">{error}</div>}

          {loading ? (
            <div className="edit-modal-loading">Loading…</div>
          ) : (
            <>
              {/* Top row: Create Skill (left) + Course Details (right) */}
              <div className="edit-modal-top-row">
                <div className="edit-modal-card create-skill-card">
                  <div className="edit-modal-card-title">Create Skill</div>

                  <input
                    className="edit-modal-input"
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    placeholder="Skill name"
                    list="skill-suggestions"
                  />

                  <datalist id="skill-suggestions">
                    {skillSuggestions.map((s) => (
                      <option key={s.Skill_Id} value={s.Skill_name} />
                    ))}
                  </datalist>

                  <div className="edit-modal-card-actions">
                    <button
                      className="btn-primary"
                      onClick={handleCreateSkill}
                      disabled={creating || !newSkillName.trim()}
                    >
                      {creating ? "Creating…" : "Add Skill"}
                    </button>
                  </div>
                </div>

                { /* Course Details */ }
                <div className="edit-modal-card details-card">
                  <div className="edit-modal-card-title">Course Details</div>

                  <div style={{ marginBottom: "10px" }}></div>

                  <div>
                    <label
                      style={{
                        fontSize: "0.8rem",
                        color: "#64748b",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Professor
                    </label>
                    { /* Professor Dropdown */ }
                    <div className="edit-modal-input edit-modal-input-professor">
                      {isAdmin ? (
                      <select
                        id="professor-select"
                        className="professor-dropdown"
                        value={newProfessorName}
                        onChange={(e) => setNewProfessorName(e.target.value)}
                      >
                        {availableProfessors.length > 0 ? (
                          availableProfessors.map((m) => (
                            <option key={m.Faculty_Id} value={`${m.FirstName} ${m.LastName}`}>
                              {m.FirstName} {m.LastName}
                            </option>
                          ))
                        ) : (
                          <option>Loading...</option>
                        )}
                      </select>
                      ) : (
                        <span>{newProfessorName || "Unassigned"}</span>
                      )}
                      {isAdmin && (
                        <button
                          className="icon-btn danger"
                          onClick={handleDeleteProfessor}
                          aria-label="Remove"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills / Competencies */}
              <div className="edit-modal-columns">
                {/* Assigned Skills */}
                <div className="edit-modal-column">
                  <h3>Assigned Skills</h3>
                  <div className="edit-modal-list">
                    {assignedSkills.length === 0 &&
                      pendingSkillNames.length === 0 && (
                        <div className="edit-modal-empty">
                          No skills assigned yet.
                        </div>
                      )}

                    {assignedSkills.map((s) => (
                      <div key={s.id} className="edit-modal-bank-row">
                        <span>{s.name}</span>
                        <button
                          className="icon-btn danger"
                          onClick={() => handleDeleteSkill(s.id)}
                          aria-label="Remove"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {pendingSkillNames.map((name) => (
                      <div
                        key={`pending:${name}`}
                        className="edit-modal-bank-row"
                      >
                        <span>
                          {name} <span style={{ opacity: 0.6 }}>(pending)</span>
                        </span>
                        <button
                          className="icon-btn danger"
                          onClick={() =>
                            setPendingSkillNames((prev) =>
                              prev.filter((x) => x !== name),
                            )
                          }
                          aria-label="Remove"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Competencies */}
                <div className="edit-modal-column">
                  <h3>Competencies</h3>

                  <input
                    className="edit-modal-search"
                    value={competencySearch}
                    onChange={(e) => setCompetencySearch(e.target.value)}
                    placeholder="Search competencies"
                  />

                  <div className="edit-modal-list">
                    {filteredCompetencies.length === 0 && (
                      <div className="edit-modal-empty">
                        No competencies match your search.
                      </div>
                    )}

                    {filteredCompetencies.map((c) => (
                      <label key={c.Skill_Id} className="edit-modal-item">
                        <input
                          type="checkbox"
                          checked={selectedCompetencyIds.includes(c.Skill_Id)}
                          onChange={() =>
                            setSelectedCompetencyIds((prev) =>
                              prev.includes(c.Skill_Id)
                                ? prev.filter((x) => x !== c.Skill_Id)
                                : [...prev, c.Skill_Id],
                            )
                          }
                        />
                        {c.Skill_name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ---------- Footer ---------- */}
        <div className="edit-modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
