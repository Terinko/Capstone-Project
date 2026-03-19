import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import Footer from "./footer";
import "./studentDashboard.css";
import Navbar from "./Navbar";

const API_KEY = import.meta.env.VITE_AIAPIKEY;
const OPENROUTER_URL = import.meta.env.VITE_OPEN_ROUTER_URL;
const MODEL_ID = import.meta.env.VITE_MODEL_ID;

const getVal = (obj: any, key: string) => {
  if (!obj) return undefined;
  if (obj[key] !== undefined) return obj[key];
  if (obj[key.toLowerCase()] !== undefined) return obj[key.toLowerCase()];
  if (obj[key.toUpperCase()] !== undefined) return obj[key.toUpperCase()];
  return undefined;
};

type MajorOption =
  | "Software Engineering"
  | "Computer Science"
  | "Mechanical Engineering"
  | "Industrial Engineering";

type GenerationMode = "skills" | "talkingPoints";

// One entry per unique Course_Code within a major.
// offerings holds every DB row that shares that code (one per version).
interface CourseOffering {
  id: string;
  altName: string | null;
}

interface ClassOption {
  courseCode: string;
  offerings: CourseOffering[];
}

interface Skill {
  Skill_Id: string;
  Skill_Name: string;
  Type: boolean;
}

const StudentDashboard: React.FC = () => {
  const [major, setMajor] = useState<MajorOption>("Software Engineering");
  const [checkedCodes, setCheckedCodes] = useState<Set<string>>(new Set());
  const [versionSelections, setVersionSelections] = useState<
    Record<string, string>
  >({});
  const [bullets, setBullets] = useState<string[]>([]);
  const [courseSkills, setCourseSkills] = useState<Record<string, Skill[]>>({});

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoadingSkills, setIsLoadingSkills] = useState<boolean>(false);

  const [showRawSkills, setShowRawSkills] = useState<boolean>(false);
  const [generationMode, setGenerationMode] =
    useState<GenerationMode>("skills");

  const [majorClasses, setMajorClasses] = useState<Record<
    MajorOption,
    ClassOption[]
  > | null>(null);

  // 1. FETCH CLASSES ON MOUNT
  useEffect(() => {
    const fetchMajorClasses = async () => {
      try {
        const response = await fetch("http://localhost:3001/courses");
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        const result = await response.json();
        setMajorClasses(result);
      } catch (err) {
        console.error("Failed to load classes:", err);
      }
    };

    fetchMajorClasses();
  }, []);

  const availableClasses = useMemo(() => {
    const baseClasses =
      majorClasses && majorClasses[major] ? majorClasses[major] : [];

    return baseClasses.map((course) => {
      const hasAlternate = course.offerings.some(
        (o) => o.altName && o.altName.trim() !== "",
      );

      let filteredOfferings = hasAlternate
        ? course.offerings.filter((o) => o.altName && o.altName.trim() !== "")
        : course.offerings;

      filteredOfferings = Array.from(
        new Map(
          filteredOfferings.map((o) => [o.altName?.trim() || "Standard", o]),
        ).values(),
      );

      return { ...course, offerings: filteredOfferings };
    });
  }, [majorClasses, major]);

  // 2. LOAD SKILLS WHEN MAJOR OR CLASSES CHANGE
  useEffect(() => {
    const loadSkillsForClasses = async () => {
      if (!availableClasses || availableClasses.length === 0) {
        setCourseSkills({});
        return;
      }

      setIsLoadingSkills(true);

      try {
        const allOfferingIds = availableClasses
          .flatMap((c) => c.offerings.map((o) => Number(o.id)))
          .filter((n) => !isNaN(n) && n > 0);

        if (allOfferingIds.length === 0) {
          setCourseSkills({});
          setIsLoadingSkills(false);
          return;
        }

        const { data: mappingsData, error: mappingsError } = await supabase
          .from("Courses_Skill_Mapping")
          .select("*")
          .in("Course_Id", allOfferingIds);

        if (mappingsError) throw mappingsError;

        if (!mappingsData || mappingsData.length === 0) {
          setCourseSkills({});
          return;
        }

        const skillIds = [
          ...new Set(mappingsData.map((m) => getVal(m, "Skill_Id"))),
        ];

        const { data: skillsData, error: skillsError } = await supabase
          .from("Skills")
          .select("*")
          .in("Skill_Id", skillIds);

        if (skillsError) throw skillsError;

        const allSkills = (skillsData || []).map((s) => ({
          Skill_Id: getVal(s, "Skill_Id"),
          Skill_Name: getVal(s, "Skill_name"),
          Type: getVal(s, "Type"),
        }));

        const skillsLookup: Record<string, Skill[]> = {};

        mappingsData.forEach((mapping) => {
          const mCourseId = getVal(mapping, "Course_Id");
          const mSkillId = getVal(mapping, "Skill_Id");
          const key = String(mCourseId);

          const skillDetail = allSkills.find(
            (s) => String(s.Skill_Id) === String(mSkillId),
          );

          if (skillDetail) {
            if (!skillsLookup[key]) skillsLookup[key] = [];
            if (
              !skillsLookup[key].some(
                (s) => s.Skill_Id === skillDetail.Skill_Id,
              )
            ) {
              skillsLookup[key].push(skillDetail);
            }
          }
        });

        setCourseSkills(skillsLookup);
      } catch (error: any) {
        console.error("Error loading skills:", error);
        setErrorMsg(
          `Database Error: ${error.message || "Failed to load skills"}`,
        );
      } finally {
        setIsLoadingSkills(false);
      }
    };

    loadSkillsForClasses();
  }, [major, majorClasses]);

  const toggleCourse = (courseCode: string) => {
    setCheckedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(courseCode)) {
        next.delete(courseCode);
        setVersionSelections((o) => {
          const n = { ...o };
          delete n[courseCode];
          return n;
        });
      } else {
        next.add(courseCode);
      }
      return next;
    });
    setBullets([]);
  };

  const selectVersion = (courseCode: string, offeringId: string) => {
    setVersionSelections((prev) => ({ ...prev, [courseCode]: offeringId }));
    setBullets([]);
  };

  const getResolvedId = (course: ClassOption): string | null => {
    if (!checkedCodes.has(course.courseCode)) return null;
    if (course.offerings.length === 1) return course.offerings[0].id;
    return versionSelections[course.courseCode] ?? null;
  };

  const needsSectionCount = availableClasses.filter(
    (c) => checkedCodes.has(c.courseCode) && getResolvedId(c) === null,
  ).length;

  const buildResumePrompt = (
    classBlocks: string,
  ) => `Act as a professional resume writer.
I will provide skills and tasks learned, grouped by university course.
Transform these into strong, action-oriented resume bullet points, grouped by course.

${classBlocks}

Requirements:
1. Output each course as a labeled section header using only alphabetical and numeric characters and a colon (e.g., "SER-491:").
2. Under each course, list 2-4 bullet points using strong action verbs (e.g., Engineered, Orchestrated, Developed).
3. Consolidate related skills within the same course where appropriate.
4. Do not include any markdown formatting.
5. Return plain text only, with course headers followed by bullet points on new lines.
`;

  const buildTalkingPointsPrompt = (
    classBlocks: string,
  ) => `Act as a technical interview coach.

I will provide skills and tasks learned, grouped by university course.
Transform them into interview-ready talking points that a student can say out loud.

${classBlocks}

Requirements:
1. Output each course as a labeled section header using only alphabetical and numeric characters and a colon (e.g., "SER-491:").
2. For each skill provided, generate EXACTLY ONE talking point.
3. Do NOT combine skills together.
4. Do NOT create multiple talking points for a single skill.
5. Each talking point must be on its own new line and begin with a dash (-).
6. Write each talking point in first-person language (e.g., "I built...", "I implemented...", "I worked with...").
7. Each talking point should:
   - Clearly explain what was done
   - Reference tools, technologies, or concepts when possible
   - Sound natural for an interview response
8. Keep each talking point concise (1-2 sentences max).
9. Do not include markdown formatting.
10. Return plain text only.

Strict Rule:
- If a course has N skills listed, you must return exactly N talking points for that course.
- Maintain a one-to-one mapping between input skills and output talking points.
`;

  const generateWithAI = async (
    skillsByClass: Record<string, string[]>,
    mode: GenerationMode,
  ) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const classBlocks = Object.entries(skillsByClass)
        .map(
          ([courseCode, skills]) =>
            `Course: ${courseCode}\n${skills.map((s) => `- ${s}`).join("\n")}`,
        )
        .join("\n\n");

      const prompt =
        mode === "skills"
          ? buildResumePrompt(classBlocks)
          : buildTalkingPointsPrompt(classBlocks);

      const payload = {
        model: MODEL_ID,
        messages: [{ role: "user", content: prompt }],
      };

      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "Student Resume Dashboard",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP error ${response.status}`);

      const result = await response.json();
      const text = result.choices?.[0]?.message?.content || "";

      const formattedBullets = text
        .split("\n")
        .map((line: string) => line.replace(/^[*-]\s*/, "").trim())
        .filter((line: string) => line.length > 0);

      setBullets(formattedBullets);
    } catch (error: any) {
      console.error("OpenRouter Error:", error);
      setErrorMsg(
        mode === "skills"
          ? "Failed to generate resume bullet points."
          : "Failed to generate talking points.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = () => {
    if (!availableClasses || availableClasses.length === 0) {
      setBullets([
        `Class-based content for ${major} is coming soon.`,
        "For now, try selecting Software Engineering to see an example.",
      ]);
      return;
    }

    if (checkedCodes.size === 0) {
      setBullets([
        generationMode === "skills"
          ? "Select at least one class to generate bullet points."
          : "Select at least one class to generate talking points.",
      ]);
      return;
    }

    const skillsByClass: Record<string, string[]> = {};

    availableClasses.forEach((course) => {
      const resolvedId = getResolvedId(course);
      if (!resolvedId) return;

      const skills = courseSkills[resolvedId];
      if (skills && skills.length > 0) {
        skillsByClass[course.courseCode] = skills
          .map((skill) => skill.Skill_Name)
          .filter(Boolean);
      }
    });

    if (Object.keys(skillsByClass).length === 0) {
      setBullets(["No skills found in the database for the selected classes."]);
      return;
    }

    if (showRawSkills) {
      const flat = Object.entries(skillsByClass).flatMap(([course, skills]) => [
        `${course}:`,
        ...skills,
      ]);
      setBullets(flat);
    } else {
      generateWithAI(skillsByClass, generationMode);
    }
  };

  const handleCopy = () => {
    if (bullets.length === 0) return;
    navigator.clipboard.writeText(bullets.join("\n"));
    alert(
      generationMode === "skills"
        ? "Bullet points copied to clipboard!"
        : "Talking points copied to clipboard!",
    );
  };

  const handleDownload = () => {
    if (bullets.length === 0) return;
    const text = bullets.join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      generationMode === "skills"
        ? "generated-bullet-points.txt"
        : "generated-talking-points.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard-page">
      <Navbar />

      <main className="dashboard-main">
        <section className="dashboard-title-block">
          <h1 className="dashboard-title">Student Dashboard</h1>
          <p className="dashboard-subtitle">
            Everything you need, in one place.
          </p>
        </section>

        <section className="card-section">
          <div className="card-surface">
            <h2 className="card-title">Build Your Schedule</h2>

            <div className="major-row">
              <select
                id="major-select"
                className="major-select"
                value={major}
                onChange={(e) => {
                  const newMajor = e.target.value as MajorOption;
                  setMajor(newMajor);
                  setCheckedCodes(new Set());
                  setVersionSelections({});
                  setBullets([]);
                  setErrorMsg(null);
                }}
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
              </select>
            </div>

            <div className="card-row">
              <span className="field-label">Select Classes:</span>

              {isLoadingSkills ? (
                <p
                  className="text-muted"
                  style={{ marginTop: "0.3rem", fontSize: "0.85rem" }}
                >
                  Loading skills from database...
                </p>
              ) : availableClasses && availableClasses.length > 0 ? (
                <div className="class-grid">
                  {availableClasses.map((course) => {
                    const isChecked = checkedCodes.has(course.courseCode);
                    const hasMany = course.offerings.length > 1;
                    const resolvedId = getResolvedId(course);
                    const needsPick =
                      isChecked && hasMany && resolvedId === null;

                    return (
                      <div
                        key={course.courseCode}
                        style={{ display: "contents" }}
                      >
                        <label
                          className={`class-option${isChecked ? " checked" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCourse(course.courseCode)}
                          />
                          <span>{course.courseCode}</span>
                          {needsPick && (
                            <span
                              style={{
                                color: "#f59e0b",
                                fontWeight: 700,
                                marginLeft: 2,
                              }}
                            >
                              !
                            </span>
                          )}
                        </label>

                        {isChecked && hasMany && (
                          <div className="offering-sub-row">
                            <span className="offering-sub-label">
                              Which version?
                            </span>
                            {course.offerings.map((offering) => {
                              const isSelected =
                                versionSelections[course.courseCode] ===
                                offering.id;
                              return (
                                <button
                                  key={offering.id}
                                  type="button"
                                  className={`offering-pill${isSelected ? " selected" : ""}`}
                                  onClick={() =>
                                    selectVersion(
                                      course.courseCode,
                                      offering.id,
                                    )
                                  }
                                >
                                  {offering.altName ?? "Standard"}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p
                  className="text-muted"
                  style={{ marginTop: "0.3rem", fontSize: "0.85rem" }}
                >
                  No classes found for this major.
                </p>
              )}

              {needsSectionCount > 0 && (
                <p
                  style={{
                    marginTop: "0.75rem",
                    fontSize: "0.8rem",
                    color: "#f59e0b",
                    fontWeight: 600,
                  }}
                >
                  ⚠ {needsSectionCount} selected course
                  {needsSectionCount > 1 ? "s" : ""} still need
                  {needsSectionCount === 1 ? "s" : ""} a version selected before
                  generating.
                </p>
              )}
            </div>

            <div
              className="generate-row"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                marginTop: "2rem",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                {/* NEW TOGGLE GOES HERE */}
                <div className="generation-toggle-wrap">
                  <span
                    className={`toggle-label ${
                      generationMode === "skills" ? "active" : ""
                    }`}
                  >
                    Skill Generation
                  </span>

                  <button
                    type="button"
                    className={`generation-toggle ${
                      generationMode === "talkingPoints" ? "is-on" : ""
                    }`}
                    onClick={() => {
                      setGenerationMode((prev) =>
                        prev === "skills" ? "talkingPoints" : "skills",
                      );
                      setBullets([]);
                      setErrorMsg(null);
                    }}
                  >
                    <span className="generation-toggle-track">
                      <span className="generation-toggle-thumb" />
                    </span>
                  </button>

                  <span
                    className={`toggle-label ${
                      generationMode === "talkingPoints" ? "active" : ""
                    }`}
                  >
                    Talking Points
                  </span>
                </div>

                {/* KEEP THIS (your raw skills toggle stays) */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    color: "#64748b",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showRawSkills}
                    onChange={(e) => setShowRawSkills(e.target.checked)}
                  />
                  Tech Demo: Show Raw Skills
                </label>
              </div>

              <button
                type="button"
                className={`btn-generate ${isLoading ? "btn-loading" : ""}`}
                onClick={handleGenerate}
                disabled={isLoading || isLoadingSkills || needsSectionCount > 0}
              >
                {isLoading
                  ? "Generating..."
                  : generationMode === "skills"
                    ? "Generate Skills with AI"
                    : "Generate Talking Points with AI"}
              </button>
            </div>
          </div>
        </section>

        <section className="card-section">
          <div className="card-surface bullets-card">
            <div className="bullets-header">
              <h2 className="card-title">
                {showRawSkills
                  ? "Raw Skills (Tech Demo):"
                  : generationMode === "skills"
                    ? "Generated Bullet Points:"
                    : "Generated Talking Points:"}
              </h2>

              <div className="bullets-button">
                <button
                  type="button"
                  className="btn-export"
                  onClick={handleDownload}
                  disabled={bullets.length === 0 || isLoading}
                  aria-label="Download generated content"
                >
                  Export
                </button>

                <button
                  type="button"
                  className="icon-button"
                  onClick={handleCopy}
                  disabled={bullets.length === 0 || isLoading}
                  aria-label="Copy generated content"
                >
                  <i className="bi bi-clipboard"></i>
                </button>
              </div>
            </div>

            <div className="bullets-body">
              {isLoading ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>
                    {generationMode === "skills"
                      ? "Generating bullet points with AI..."
                      : "Generating talking points with AI..."}
                  </p>
                </div>
              ) : errorMsg ? (
                <p className="error-text">{errorMsg}</p>
              ) : bullets.length === 0 ? (
                <p className="placeholder-text">
                  Select classes and click "Generate" to see your AI-generated
                  content.
                </p>
              ) : (
                <ul>
                  {bullets.map((b, idx) =>
                    b.endsWith(":") || b.startsWith("---") ? (
                      <p
                        key={idx}
                        style={{
                          fontWeight: "bold",
                          marginTop: "0.75rem",
                          listStyle: "none",
                        }}
                      >
                        {b}
                      </p>
                    ) : (
                      <li key={idx}>{b}</li>
                    ),
                  )}
                </ul>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default StudentDashboard;
