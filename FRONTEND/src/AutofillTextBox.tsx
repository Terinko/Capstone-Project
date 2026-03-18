import React, { useEffect, useMemo, useState } from "react";
import {
  loadAutofillDataset,
  searchAutofill,
  type AutofillDataset,
} from "./Autofill";

type Props = {
  value: string; // comma-separated string
  onChange: (next: string) => void; // updates parent state
  placeholder?: string;
  label?: string;
  limit?: number;
};

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

function parseCommaList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function toCommaList(arr: string[]): string {
  return arr.join(", ");
}

export default function AutofillSkillBox({
  value,
  onChange,
  placeholder = "Skills (e.g., React, SQL, Agile)",
  limit = 10,
}: Props) {
  const [dataset, setDataset] = useState<AutofillDataset | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => parseCommaList(value), [value]);

  const selectedSet = useMemo(
    () => new Set(selected.map((s) => normalize(s))),
    [selected],
  );

  useEffect(() => {
    let cancelled = false;

    setError(null);

    loadAutofillDataset({ scope: "all" })
      .then((d) => {
        if (!cancelled) setDataset(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Failed to load skills");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => {
    if (!dataset) return [];

    const items = searchAutofill(dataset, query, {
      limit: limit + 20,
      type: "skill",
    });

    // Filter out already selected
    return items
      .filter((it) => !selectedSet.has(normalize(it.Skill_name)))
      .slice(0, limit);
  }, [dataset, query, selectedSet, limit]);

  const addTypedSkill = () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const norm = normalize(trimmed);
    if (selectedSet.has(norm)) {
      setQuery("");
      return;
    }

    const next = [...selected, trimmed];
    onChange(toCommaList(next));
    setQuery("");
  };

  const addSkill = (name: string) => {
    const norm = normalize(name);
    if (selectedSet.has(norm)) return;

    const next = [...selected, name];
    onChange(toCommaList(next));
  };

  const removeSkill = (name: string) => {
    const next = selected.filter((x) => normalize(x) !== normalize(name));
    onChange(toCommaList(next));
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Selected chips */}
      {selected.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 8,
          }}
        >
          {selected.map((s) => (
            <span key={s} className="skill-chip">
              {s}
              <button
                type="button"
                onClick={() => removeSkill(s)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 16,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <input
        className="textbox faculty-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTypedSkill();
          }
        }}
        placeholder={placeholder}
      />

      {error && <div style={{ marginTop: 8, color: "crimson" }}>{error}</div>}

      {/* Dropdown */}
      {!error && dataset && query.trim().length > 0 && results.length > 0 && (
        <div className="skill-dropdown">
          {results.map((r) => (
            <button
              key={r.Skill_Id}
              type="button"
              onClick={() => {
                addSkill(r.Skill_name);
                setQuery("");
              }}
              className="skill-dropdown-item"
            >
              {r.Skill_name}
            </button>
          ))}
        </div>
      )}

      {!error && dataset && query.trim().length > 0 && results.length === 0 && (
        <div className="skill-no-matches">
          No matches. Press Enter to add "{query.trim()}" as a new skill.
        </div>
      )}
    </div>
  );
}
