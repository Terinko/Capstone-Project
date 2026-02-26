import React, { useState, useEffect } from "react";
// Updated import to match the local file structure
import { supabase } from "../supabaseClient";
// Assumed relative imports for other components
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

interface ClassOption {
  id: string; // This is now the DB Course_Id (as string)
  label: string; // This is the Course_Code
  courseId?: string; // This is the Course_Code (kept for compatibility)
}

interface Skill {
  Skill_Id: string;
  Skill_Name: string;
  Type: boolean;
}

const StudentDashboard: React.FC = () => {
  const [major, setMajor] = useState<MajorOption>("Software Engineering");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [bullets, setBullets] = useState<string[]>([]);
  const [courseSkills, setCourseSkills] = useState<Record<string, Skill[]>>({});

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoadingSkills, setIsLoadingSkills] = useState<boolean>(false);

  const [showRawSkills, setShowRawSkills] = useState<boolean>(false);

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

  const availableClasses =
    majorClasses && majorClasses[major] ? majorClasses[major] : [];

  // 2. LOAD SKILLS WHEN MAJOR OR CLASSES CHANGE
  useEffect(() => {
    const loadSkillsForClasses = async () => {
      if (!availableClasses || availableClasses.length === 0) {
        setCourseSkills({});
        return;
      }

      setIsLoadingSkills(true);

      try {
        const validNumericIds = availableClasses
          .map((c) => Number(c.id))
          .filter((n) => !isNaN(n) && n > 0);

        if (validNumericIds.length === 0) {
          setCourseSkills({});
          setIsLoadingSkills(false);
          return;
        }

        const { data: mappingsData, error: mappingsError } = await supabase
          .from("Courses_Skill_Mapping")
          .select("*")
          .in("Course_Id", validNumericIds);

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

        const idToCodeMap: Record<number, string> = {};
        availableClasses.forEach((c) => {
          idToCodeMap[Number(c.id)] = c.courseId!;
        });

        const allSkills = (skillsData || []).map((s) => ({
          Skill_Id: getVal(s, "Skill_Id"),
          Skill_Name: getVal(s, "Skill_name"),
          Type: getVal(s, "Type"),
        }));

        const skillsLookup: Record<string, Skill[]> = {};

        mappingsData.forEach((mapping) => {
          const mCourseId = getVal(mapping, "Course_Id");
          const mSkillId = getVal(mapping, "Skill_Id");

          const courseCodeStr = idToCodeMap[mCourseId];

          if (courseCodeStr) {
            const skillDetail = allSkills.find(
              (s) => String(s.Skill_Id) === String(mSkillId),
            );
            if (skillDetail) {
              if (!skillsLookup[courseCodeStr]) {
                skillsLookup[courseCodeStr] = [];
              }
              if (
                !skillsLookup[courseCodeStr].some(
                  (s) => s.Skill_Id === skillDetail.Skill_Id,
                )
              ) {
                skillsLookup[courseCodeStr].push(skillDetail);
              }
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

  const handleClassToggle = (id: string) => {
    setSelectedClasses((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const generateWithGemma = async (skillsByClass: Record<string, string[]>) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const classBlocks = Object.entries(skillsByClass)
        .map(
          ([courseCode, skills]) =>
            `Course: ${courseCode}\n${skills.map((s) => `- ${s}`).join("\n")}`,
        )
        .join("\n\n");

      const prompt = `Act as a professional resume writer.
I will provide skills and tasks learned, grouped by university course.
Transform these into strong, action-oriented resume bullet points, grouped by course.

${classBlocks}

Requirements:
1. Output each course as a labeled section header using only alphabetical and numeric characters and a (e.g., "SER-491:").
2. Under each course, list 2-4 bullet points using strong action verbs (e.g., Engineered, Orchestrated, Developed).
3. Consolidate related skills within the same course where appropriate.
4. Do not include any markdown formatting (like **bold**).
5. Return plain text only, with course headers followed by bullet points on new lines.
`;

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
      setErrorMsg("Failed to generate bullets with Gemma 3.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = () => {
    if (!availableClasses || availableClasses.length === 0) {
      setBullets([
        `Class-based bullet points for ${major} are coming soon.`,
        "For now, try selecting Software Engineering to see an example.",
      ]);
      return;
    }

    if (selectedClasses.length === 0) {
      setBullets(["Select at least one class to generate bullet points."]);
      return;
    }

    const selectedClassObjects = availableClasses.filter((c) =>
      selectedClasses.includes(c.id),
    );

    // Build a map of { courseLabel -> skill descriptions[] } to preserve class context
    const skillsByClass: Record<string, string[]> = {};

    selectedClassObjects.forEach((classObj) => {
      const lookupId = classObj.courseId;

      if (lookupId && courseSkills[lookupId]) {
        const descriptions = courseSkills[lookupId]
          .map((skill) => skill.Skill_Name)
          .filter(Boolean);
        if (descriptions.length > 0) {
          skillsByClass[classObj.label] = descriptions;
        }
      }
    });

    if (Object.keys(skillsByClass).length === 0) {
      setBullets(["No skills found in the database for the selected classes."]);
      return;
    }

    if (showRawSkills) {
      // Show raw skills grouped by course for the tech demo
      const flat = Object.entries(skillsByClass).flatMap(([course, skills]) => [
        `${course}:`,
        ...skills,
      ]);
      setBullets(flat);
    } else {
      generateWithGemma(skillsByClass);
    }
  };

  const handleCopy = () => {
    if (bullets.length === 0) return;
    navigator.clipboard.writeText(bullets.join("\n"));
    alert("Bullet points copied to clipboard!");
  };

  const handleDownload = () => {
    if (bullets.length === 0) return;
    const text = bullets.join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "generated-bullet-points.txt";
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
                  setSelectedClasses([]);
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
                  {availableClasses.map((c) => (
                    <label key={c.id} className="class-option">
                      <input
                        type="checkbox"
                        checked={selectedClasses.includes(c.id)}
                        onChange={() => handleClassToggle(c.id)}
                      />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p
                  className="text-muted"
                  style={{ marginTop: "0.3rem", fontSize: "0.85rem" }}
                >
                  No classes found for this major.
                </p>
              )}
            </div>

            <div
              className="generate-row"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "1rem",
                marginTop: "2rem",
              }}
            >
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

              <button
                type="button"
                className={`btn-generate ${isLoading ? "btn-loading" : ""}`}
                onClick={handleGenerate}
                disabled={isLoading || isLoadingSkills}
              >
                {isLoading ? "Generating..." : "Generate with AI"}
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
                  : "Generated Bullet Points:"}
              </h2>

              <div className="bullets-button">
                <button
                  type="button"
                  className="btn-export"
                  onClick={handleDownload}
                  disabled={bullets.length === 0 || isLoading}
                  aria-label="Download bullet points"
                >
                  Export
                </button>

                <button
                  type="button"
                  className="icon-button"
                  onClick={handleCopy}
                  disabled={bullets.length === 0 || isLoading}
                  aria-label="Copy bullet points"
                >
                  <i className="bi bi-clipboard"></i>
                </button>
              </div>
            </div>

            <div className="bullets-body">
              {isLoading ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Generating bullet points with AI...</p>
                </div>
              ) : errorMsg ? (
                <p className="error-text">{errorMsg}</p>
              ) : bullets.length === 0 ? (
                <p className="placeholder-text">
                  Select classes and click "Generate" to see your AI-enhanced
                  resume bullets.
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
