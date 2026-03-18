import React, {
  useState,
  useEffect,
  type ChangeEvent,
  type FormEvent,
} from "react";
import "./FacultyDashboard.css";
import AutofillSkillBox from "./AutofillTextBox";

type MajorOption = string;

interface SkillOption {
  Skill_Id: number;
  Skill_name: string;
  Type: boolean;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const FacultyDashboard: React.FC = () => {
  const facultyId = 34;

  const MAJOR_PREFIX_MAP: Record<string, string> = {
    "Software Engineering": "SER",
    "Computer Science": "CSC",
    "Mechanical Engineering": "MER",
    "Industrial Engineering": "IER",
    "Civil Engineering": "CER",
  };

  const [selectedMajor, setSelectedMajor] = useState<MajorOption>(
    "Software Engineering",
  );
  const [availableMajors, setAvailableMajors] = useState<string[]>([]);
  const [prefixError, setPrefixError] = useState<string | null>(null);

  const [courseCode, setCourseCode] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [alternateCourseTitle, setAlternateCourseTitle] = useState("");
  const [courseSkills, setCourseSkills] = useState("");

  const [duplicateCodeFound, setDuplicateCodeFound] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  const [competencyOptions, setCompetencyOptions] = useState<SkillOption[]>([]);
  const [selectedCompetencyIds, setSelectedCompetencyIds] = useState<number[]>(
    [],
  );

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const parseSkillNames = (value: string): string[] =>
    value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const toggleCompetency = (id: number) => {
    setSelectedCompetencyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const validateCoursePrefix = (code: string, major: string) => {
    const trimmed = code.trim().toUpperCase();

    if (!trimmed || !major) {
      setPrefixError(null);
      return;
    }

    const expectedPrefix = MAJOR_PREFIX_MAP[major];
    if (!expectedPrefix) {
      setPrefixError(null);
      return;
    }

    const enteredPrefix = trimmed.split(" ")[0];

    if (enteredPrefix !== expectedPrefix) {
      setPrefixError(
        `Course code must start with "${expectedPrefix}" for ${major}.`,
      );
    } else {
      setPrefixError(null);
    }
  };

  const checkDuplicateCourseCode = async (code: string) => {
    const trimmed = code.trim();

    if (!trimmed) {
      setDuplicateCodeFound(false);
      setAlternateCourseTitle("");
      return;
    }

    try {
      setCheckingDuplicate(true);

      const params = new URLSearchParams();
      params.set("courseCode", trimmed);

      const response = await fetch(
        `${API_BASE}/api/faculty/courses/check-code?${params.toString()}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-faculty-id": String(facultyId),
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to check course code (${response.status})`);
      }

      const data = await response.json();
      const isDuplicate = Boolean(data?.exists);

      setDuplicateCodeFound(isDuplicate);

      if (!isDuplicate) {
        setAlternateCourseTitle("");
      }
    } catch (err) {
      console.error("Duplicate check failed:", err);
      setDuplicateCodeFound(false);
    } finally {
      setCheckingDuplicate(false);
    }
  };

  const addCourse = async (e: FormEvent) => {
    e.preventDefault();

    setFormError(null);
    setFormSuccess(null);

    if (!courseCode.trim() || !courseTitle.trim()) {
      setFormError("Course code and course title are required.");
      return;
    }

    try {
      setFormSubmitting(true);

      const response = await fetch(`${API_BASE}/api/faculty/courses`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-faculty-id": String(facultyId),
        },
        body: JSON.stringify({
          courseCode: courseCode.trim(),
          courseName: courseTitle.trim(),
          alternateCourseTitle: duplicateCodeFound
            ? alternateCourseTitle.trim()
            : "",
          major: selectedMajor,
          skillNames: parseSkillNames(courseSkills),
          competencyIds: selectedCompetencyIds,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to add course (${response.status})`);
      }

      setCourseCode("");
      setCourseTitle("");
      setAlternateCourseTitle("");
      setCourseSkills("");
      setSelectedCompetencyIds([]);
      setDuplicateCodeFound(false);
      setFormSuccess("Course added successfully.");
    } catch (err) {
      console.error("Add course failed:", err);
      setFormError(err instanceof Error ? err.message : "Failed to add course");
    } finally {
      setFormSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchMajors = async () => {
      try {
        const response = await fetch(`${API_BASE}/courses`);
        const result = await response.json();

        const majors = Object.keys(result ?? {});
        setAvailableMajors(majors);

        if (majors.length > 0 && !majors.includes(selectedMajor)) {
          setSelectedMajor(majors[0]);
        }
      } catch (err) {
        console.error("Failed to fetch majors:", err);
      }
    };

    fetchMajors();
  }, [selectedMajor]);

  useEffect(() => {
    const fetchCompetencies = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/faculty/skills-options`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to load competencies (${response.status})`);
        }

        const data = await response.json();
        const competencies = Array.isArray(data?.competencies)
          ? data.competencies
          : [];

        setCompetencyOptions(competencies);
      } catch (err) {
        console.error("Failed to load competencies:", err);
      }
    };

    fetchCompetencies();
  }, []);

  const isSubmitDisabled =
    formSubmitting ||
    checkingDuplicate ||
    !selectedMajor.trim() ||
    !courseCode.trim() ||
    !courseTitle.trim() ||
    !!prefixError ||
    (duplicateCodeFound && !alternateCourseTitle.trim());

  return (
    <section className="card-section">
      <div className="card-surface">
        <h2>Add Course Mapping</h2>

        <form onSubmit={addCourse} className="faculty-form">
          <select
            className="textbox faculty-input"
            value={selectedMajor}
            onChange={(e) => {
              const newMajor = e.target.value;
              setSelectedMajor(newMajor);
              validateCoursePrefix(courseCode, newMajor);
            }}
          >
            {availableMajors.length > 0 ? (
              availableMajors.map((major) => (
                <option key={major} value={major}>
                  {major}
                </option>
              ))
            ) : (
              <option>Loading...</option>
            )}
          </select>

          <input
            className="textbox faculty-input"
            type="text"
            placeholder="Course Code (e.g., SER 210)"
            value={courseCode}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const value = e.target.value.toUpperCase();
              setCourseCode(value);
              validateCoursePrefix(value, selectedMajor);
            }}
            onBlur={() => {
              validateCoursePrefix(courseCode, selectedMajor);
              void checkDuplicateCourseCode(courseCode);
            }}
          />
          {prefixError && <div className="form-error">{prefixError}</div>}

          <input
            className="textbox faculty-input"
            type="text"
            placeholder="Course Title (e.g., Software Design and Architecture)"
            value={courseTitle}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setCourseTitle(e.target.value)
            }
          />

          {duplicateCodeFound && (
            <div className="form-warning">
              This course code already exists. Please enter an alternate course
              title.
            </div>
          )}

          {duplicateCodeFound && (
            <input
              className="textbox faculty-input"
              type="text"
              placeholder="Alternate Course Title"
              value={alternateCourseTitle}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setAlternateCourseTitle(e.target.value)
              }
            />
          )}

          <AutofillSkillBox
            value={courseSkills}
            onChange={setCourseSkills}
            placeholder="Add Skills (e.g., React, SQL, Agile)"
          />

          <div className="competency-checkbox-grid">
            {competencyOptions.map((competency) => (
              <label key={competency.Skill_Id} className="competency-checkbox">
                <input
                  type="checkbox"
                  checked={selectedCompetencyIds.includes(competency.Skill_Id)}
                  onChange={() => toggleCompetency(competency.Skill_Id)}
                />
                <span>{competency.Skill_name}</span>
              </label>
            ))}
          </div>

          {formError && <div className="form-error">{formError}</div>}
          {formSuccess && <div className="form-success">{formSuccess}</div>}

          <button
            type="submit"
            className="faculty-submit-button centered-button"
            disabled={isSubmitDisabled}
          >
            {formSubmitting ? "Adding..." : "Add Course"}
          </button>
        </form>
      </div>
    </section>
  );
};

export default FacultyDashboard;
