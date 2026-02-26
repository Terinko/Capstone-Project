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
  label = "Skills",
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
      <label
        style={{
          display: "block",
          marginBottom: "0.5rem",
          fontWeight: "bold",
        }}
      >
        {label}
      </label>

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
            <span
              key={s}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #ddd",
                background: "#fff",
                fontSize: 14,
              }}
            >
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
        className="textbox"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          boxSizing: "border-box",
        }}
      />

      {error && <div style={{ marginTop: 8, color: "crimson" }}>{error}</div>}

      {/* Dropdown */}
      {!error && dataset && query.trim().length > 0 && results.length > 0 && (
        <div
          style={{
            marginTop: 8,
            border: "1px solid #ddd",
            borderRadius: 8,
            overflow: "hidden",
            background: "#fff",
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {results.map((r) => (
            <button
              key={r.Skill_Id}
              type="button"
              onClick={() => {
                addSkill(r.Skill_name);
                setQuery("");
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                border: "none",
                borderBottom: "1px solid #eee",
                background: "white",
                cursor: "pointer",
              }}
            >
              {r.Skill_name}
            </button>
          ))}
        </div>
      )}

      {!error && dataset && query.trim().length > 0 && results.length === 0 && (
        <div style={{ marginTop: 8, opacity: 0.7 }}>No matches.</div>
      )}
    </div>
  );
}
