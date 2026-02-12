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

const fetchWithExponentialBackoff = async (
  url: string,
  payload: any,
  maxRetries = 5,
) => {
  let delay = 1000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
          throw new Error(`HTTP error ${response.status}`);
        } else {
          const errorResult = await response.json();
          throw new Error(
            errorResult?.error?.message || `HTTP error ${response.status}`,
          );
        }
      }

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error("No valid content received from API.");
      }

      return result;
    } catch (error: any) {
      console.error(`Attempt ${i + 1} failed: ${error.message}`);
      if (i === maxRetries - 1) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
};

const getVal = (obj: any, key: string) => {
  if (!obj) return undefined;
  if (obj[key] !== undefined) return obj[key];
  // Check lowercase match
  if (obj[key.toLowerCase()] !== undefined) return obj[key.toLowerCase()];
  // Check uppercase match (rare but possible)
  if (obj[key.toUpperCase()] !== undefined) return obj[key.toUpperCase()];
  return undefined;
};

type MajorOption =
  | "Software Engineering"
  | "Computer Science"
  | "Mechanical Engineering"
  | "Industrial Engineering";

interface ClassOption {
  id: string;
  label: string;
  courseId?: string;
}

interface Skill {
  Skill_Id: string;
  Skill_Name: string;
  Type: boolean;
  Description: string;
}

const SOFTWARE_ENGINEERING_CLASSES: ClassOption[] = [
  // UPDATE ALL items to use the dash format "SER-XXX"
  { id: "1", label: "SER-491", courseId: "SER-491" },
  { id: "2", label: "SER-340", courseId: "SER-340" },
  { id: "3", label: "SER-341", courseId: "SER-341" },
  { id: "4", label: "SER-325", courseId: "SER-325" },
  { id: "5", label: "SER-350", courseId: "SER-350" },
  { id: "6", label: "SER-330", courseId: "SER-330" },
  { id: "7", label: "SER-210", courseId: "SER-210" },
  { id: "8", label: "SER-492", courseId: "SER-492" },
  { id: "9", label: "SER-225", courseId: "SER-225" },
  { id: "10", label: "SER-375", courseId: "SER-375" },
  { id: "11", label: "SER-120", courseId: "SER-120" },
  { id: "12", label: "SER-305", courseId: "SER-305" },
];

const MAJOR_CLASSES: Record<MajorOption, ClassOption[]> = {
  "Software Engineering": SOFTWARE_ENGINEERING_CLASSES,
  "Computer Science": [],
  "Mechanical Engineering": [],
  "Industrial Engineering": [],
};

const StudentDashboard: React.FC = () => {
  const [major, setMajor] = useState<MajorOption>("Software Engineering");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [bullets, setBullets] = useState<string[]>([]);
  const [courseSkills, setCourseSkills] = useState<Record<string, Skill[]>>({});

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoadingSkills, setIsLoadingSkills] = useState<boolean>(false);

  const [showRawSkills, setShowRawSkills] = useState<boolean>(false);

  const availableClasses = MAJOR_CLASSES[major];

  useEffect(() => {
    const loadSkillsForClasses = async () => {
      setIsLoadingSkills(true);

      try {
        // 1. Get the course codes (now "SER-491") from the updated config
        const courseCodes = availableClasses
          .map((c) => c.courseId)
          .filter(Boolean) as string[];

        if (courseCodes.length === 0) {
          setCourseSkills({});
          setIsLoadingSkills(false);
          return;
        }

        // 2. LOOKUP STEP: Exchange "SER-491" for the numeric Course_Id
        const { data: coursesData, error: coursesError } = await supabase
          .from("Courses")
          .select("Course_Id, Course_Code")
          .in("Course_Code", courseCodes);

        if (coursesError) throw coursesError;

        if (!coursesData || coursesData.length === 0) {
          console.warn("No courses found in DB matching:", courseCodes);
          setCourseSkills({});
          return;
        }

        // 3. Prepare the list of Numeric IDs to fetch mappings
        const courseIdMap: Record<number, string> = {};
        const validNumericIds: number[] = [];

        coursesData.forEach((c) => {
          const cId = getVal(c, "Course_Id");
          const cCode = getVal(c, "Course_Code");
          if (cId) {
            validNumericIds.push(cId);
            courseIdMap[cId] = cCode; // Map ID 15 -> "SER-491"
          }
        });

        // 4. Fetch Mappings using the Numeric IDs
        const { data: mappingsData, error: mappingsError } = await supabase
          .from("Courses_Skill_Mapping")
          .select("*")
          .in("Course_Id", validNumericIds);

        if (mappingsError) throw mappingsError;

        if (!mappingsData || mappingsData.length === 0) {
          setCourseSkills({});
          return;
        }

        // 5. Fetch Skills
        const skillIds = [
          ...new Set(mappingsData.map((m) => getVal(m, "Skill_Id"))),
        ];

        const { data: skillsData, error: skillsError } = await supabase
          .from("Skills")
          .select("*")
          .in("Skill_Id", skillIds);

        if (skillsError) throw skillsError;

        // 6. Build the final map
        const skillsLookup: Record<string, Skill[]> = {};

        const allSkills = (skillsData || []).map((s) => ({
          Skill_Id: getVal(s, "Skill_Id"),
          Skill_Name: getVal(s, "Skill_name"),
          Type: getVal(s, "Type"),
          Description: getVal(s, "Description"),
        }));

        mappingsData.forEach((mapping) => {
          const mCourseId = getVal(mapping, "Course_Id");
          const mSkillId = getVal(mapping, "Skill_Id");

          // Convert Numeric ID back to "SER-491" so the dashboard knows where to put it
          const courseCodeStr = courseIdMap[mCourseId];

          if (courseCodeStr) {
            const skillDetail = allSkills.find(
              (s) => String(s.Skill_Id) === String(mSkillId),
            );
            if (skillDetail) {
              if (!skillsLookup[courseCodeStr]) {
                skillsLookup[courseCodeStr] = [];
              }
              // Avoid duplicates
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
  }, [major]);

  const handleClassToggle = (id: string) => {
    setSelectedClasses((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const generateWithGemma = async (skillDescriptions: string[]) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const prompt = `Act as a professional resume writer.
        I will provide a list of raw skills and tasks learned in university courses.
        Please transform these into a list of strong, action-oriented resume bullet points.
        
        Raw Skills:
        ${skillDescriptions.join("\n")}

        Requirements:
        1. Use strong action verbs (e.g., Engineered, Orchestrated, Developed).
        2. Consolidate related skills into single, impactful points where appropriate.
        3. Do not include any introductory text or markdown formatting (like **bold**).
        4. Return the output as a simple list separated by newlines.
      `;

      const payload = {
        model: MODEL_ID, // Uses google/gemma-3-27b-it:free
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

      // OpenRouter returns results in result.choices[0].message.content
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

    const skillDescriptions: string[] = [];

    selectedClassObjects.forEach((classObj) => {
      const lookupId = classObj.courseId;

      if (lookupId && courseSkills[lookupId]) {
        const descriptions = courseSkills[lookupId]
          .map((skill) => skill.Description)
          .filter(Boolean);
        skillDescriptions.push(...descriptions);
      }
    });

    if (skillDescriptions.length === 0) {
      setBullets(["No skills found in the database for the selected classes."]);
      return;
    }

    if (showRawSkills) {
      setBullets(skillDescriptions);
    } else {
      generateWithGemma(skillDescriptions);
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
                  Class selection will be available for this major soon. Try
                  Software Engineering to see an example.
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
                  {bullets.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
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
