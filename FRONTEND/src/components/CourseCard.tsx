import styles from "./CourseCard.module.css";

export interface CourseProps {
    id: number;
    name: string;
    skills: string[];
    competencies: string[];
    deleteMethod: () => void;
}

export default function CourseCard(course: CourseProps) {
  return (
    <div className={styles.main}>
      <h3>{course.name}</h3>
      <h6>Skills</h6>
      <ul>
        {course.skills.map((c) => (
          <li>{c}</li>
        ))}
      </ul>
      <h6>Competencies</h6>
      <ul>
        {course.competencies.map((c) => (
          <li>{c}</li>
        ))}
      </ul>
        <button
            onClick={course.deleteMethod}
            className={styles.deleteButton}
        >
            Delete
        </button>
    </div>
  );
}
