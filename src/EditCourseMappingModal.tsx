import React, { useEffect, useMemo, useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import "./EditCourseMappingModal.css";

/**
 * Represents a Skill or Competency option returned from the backend.
 * - Skills use Description for display
 * - Competencies use Skill_name
 */
type Option = {
  Skill_Id: number;
  Skill_name: string;
  Type: boolean;
  Description?: string | null;
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
 * Skills are returned as descriptions, competencies as names.
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
  onClose: () => void;
  onSaved: () => void;
  apiFetch: <T>(path: string, init?: RequestInit) => Promise<T>;
};

export default function EditCourseMappingModal({
  isOpen,
  courseId,
  courseCode,
  onClose,
  onSaved,
  apiFetch,
}: Props) {
  /* -------------------- UI state -------------------- */
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* -------------------- Data state -------------------- */
  const [options, setOptions] = useState<SkillsOptionsResponse | null>(null);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [selectedCompetencyIds, setSelectedCompetencyIds] = useState<number[]>(
    [],
  );

  /* -------------------- Form state -------------------- */
  const [newDescription, setNewDescription] = useState("");
  const [competencySearch, setCompetencySearch] = useState("");

  /**
   * Load available skills/competencies and current course mappings
   * whenever the modal opens or the course changes.
   */
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch options + existing mapping in parallel
        const [opts, mapping] = await Promise.all([
          apiFetch<SkillsOptionsResponse>("/api/admin/skills-options"),
          apiFetch<CourseMappingResponse>(
            `/api/admin/courses/${courseId}/mapping`,
          ),
        ]);

        if (cancelled) return;

        setOptions(opts);

        // Convert returned descriptions/names into IDs for checkbox state
        const skillIds = mapping.skills
          .map(
            (desc) =>
              opts.skills.find((s) => (s.Description ?? "") === desc)?.Skill_Id,
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
  }, [isOpen, courseId, apiFetch]);

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
        return skill
          ? { id, description: skill.Description ?? skill.Skill_name }
          : null;
      })
      .filter(Boolean) as { id: number; description: string }[];
  }, [options, selectedSkillIds]);

  /**
   * Refresh skills/competencies after creating or deleting a skill.
   */
  async function refreshOptions() {
    const opts = await apiFetch<SkillsOptionsResponse>(
      "/api/admin/skills-options",
    );
    setOptions(opts);
    return opts;
  }

  /**
   * Create a new Skill using the provided description.
   * If the backend reports it already exists, reuse it.
   */
  async function handleCreateSkill() {
    if (!newDescription.trim()) return;

    try {
      setCreating(true);
      setError(null);

      const created = await apiFetch<Option>("/api/admin/skills", {
        method: "POST",
        body: JSON.stringify({ description: newDescription.trim() }),
      });

      // Auto-select the newly created skill
      setSelectedSkillIds((prev) => [...new Set([...prev, created.Skill_Id])]);

      await refreshOptions();
      setNewDescription("");
    } catch (e: any) {
      try {
        const parsed = JSON.parse(e.message);
        if (parsed?.existing?.Skill_Id) {
          // Backend tells us this skill already exists — reuse it
          setSelectedSkillIds((prev) => [
            ...new Set([...prev, parsed.existing.Skill_Id]),
          ]);
          setError("That skill already exists — using the existing one.");
          await refreshOptions();
          return;
        }
        setError(parsed?.error ?? "Failed to create skill");
      } catch {
        setError(e?.message ?? "Failed to create skill");
      }
    } finally {
      setCreating(false);
    }
  }

  /**
   * Permanently delete a skill from the system.
   * Confirmation is required because this affects all courses.
   */
  async function handleDeleteSkill(skillId: number) {
    if (!confirm("Delete this skill everywhere?")) return;

    await apiFetch(`/api/admin/skills/${skillId}`, { method: "DELETE" });
    setSelectedSkillIds((prev) => prev.filter((id) => id !== skillId));
    await refreshOptions();
  }

  /**
   * Persist selected skill + competency mappings for this course.
   */
  async function handleSave() {
    try {
      setSaving(true);
      setError(null);

      await apiFetch(`/api/admin/courses/${courseId}/mapping`, {
        method: "PUT",
        body: JSON.stringify({
          skillIds: selectedSkillIds,
          competencyIds: selectedCompetencyIds,
        }),
      });

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
              {/* Create Skill */}
              <div className="edit-modal-create-center">
                <div className="edit-modal-card create-skill-card">
                  <div className="edit-modal-card-title">Create Skill</div>

                  <textarea
                    className="edit-modal-textarea"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Describe the skill students gain from this course"
                  />

                  <div className="edit-modal-card-actions">
                    <button
                      className="btn-primary"
                      onClick={handleCreateSkill}
                      disabled={creating || !newDescription.trim()}
                    >
                      {creating ? "Creating…" : "Add Skill"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Skills / Competencies */}
              <div className="edit-modal-columns">
                {/* Assigned Skills */}
                <div className="edit-modal-column">
                  <h3>Assigned Skills</h3>
                  <div className="edit-modal-list">
                    {assignedSkills.length === 0 && (
                      <div className="edit-modal-empty">
                        No skills assigned yet.
                      </div>
                    )}

                    {assignedSkills.map((s) => (
                      <div key={s.id} className="edit-modal-bank-row">
                        <span>{s.description}</span>
                        <button
                          className="icon-btn danger"
                          onClick={() => handleDeleteSkill(s.id)}
                          aria-label="Delete"
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
