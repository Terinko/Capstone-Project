import { supabase } from "../Database/supabaseClient.js";

// Return just the course IDs a faculty member owns via Faculty_Courses
export async function getFacultyCourseIds(facultyId: number) {
  const { data, error } = await supabase
    .from("Faculty_Courses")
    .select("Course_Id")
    .eq("Faculty_Id", facultyId);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row: any) => row.Course_Id as number)
    .filter((id) => typeof id === "number");
}

// Look up the full name of a faculty member
export async function getFacultyName(facultyId: number): Promise<string> {
  const { data, error } = await supabase
    .from("Faculty_Admin")
    .select("FirstName, LastName")
    .eq("Faculty_Id", facultyId)
    .single();

  if (error) throw new Error(error.message);
  return `${data.FirstName} ${data.LastName}`.trim();
}

/**
 * Returns all courses visible to a faculty member in a single query.
 * A course is visible if ANY of these are true:
 * 1. The faculty member owns it via Faculty_Courses
 * 2. The course Professor field is blank / null (unassigned)
 * 3. The course Professor field matches the faculty member's full name
 *
 * Filtering and joining happen in the DB — nothing is fetched and discarded
 * in JavaScript.
 */
export async function getVisibleCoursesForFaculty(
  facultyId: number,
  facultyFullName: string,
) {
  // Fetch owned course IDs and all matching courses in parallel
  const [ownedIds, byName, unassigned] = await Promise.all([
    getFacultyCourseIds(facultyId),

    // Courses where Professor matches the faculty member's name
    supabase
      .from("Courses")
      .select(
        "Course_Id, Course_Code, Course_Name, Course_Name_Alt, Major, Professor",
      )
      .ilike("Professor", facultyFullName)
      .order("Major", { ascending: true })
      .order("Course_Code", { ascending: true }),

    // Courses where Professor is blank / null
    supabase
      .from("Courses")
      .select(
        "Course_Id, Course_Code, Course_Name, Course_Name_Alt, Major, Professor",
      )
      .or("Professor.is.null,Professor.eq.")
      .order("Major", { ascending: true })
      .order("Course_Code", { ascending: true }),
  ]);

  if (byName.error) throw new Error(byName.error.message);
  if (unassigned.error) throw new Error(unassigned.error.message);

  // Fetch owned courses by ID if there are any
  let ownedRows: any[] = [];
  if (ownedIds.length > 0) {
    const { data, error } = await supabase
      .from("Courses")
      .select(
        "Course_Id, Course_Code, Course_Name, Course_Name_Alt, Major, Professor",
      )
      .in("Course_Id", ownedIds)
      .order("Major", { ascending: true })
      .order("Course_Code", { ascending: true });

    if (error) throw new Error(error.message);
    ownedRows = data ?? [];
  }

  // Merge all three sets, deduplicate by Course_Id
  const seen = new Set<number>();
  const merged: any[] = [];

  for (const row of [
    ...ownedRows,
    ...(byName.data ?? []),
    ...(unassigned.data ?? []),
  ]) {
    if (!seen.has(row.Course_Id)) {
      seen.add(row.Course_Id);
      merged.push(row);
    }
  }

  // Sort merged result by Major then Course_Code
  merged.sort((a, b) => {
    const majorCmp = a.Major.localeCompare(b.Major);
    if (majorCmp !== 0) return majorCmp;
    return a.Course_Code.localeCompare(b.Course_Code);
  });

  return merged;
}

/**
 * Returns courses where the Professor field is null, an empty string,
 * or specifically labeled "N/A".
 */
export async function getUnassignedCourses() {
  const { data, error } = await supabase
    .from("Courses")
    .select(
      "Course_Id, Course_Code, Course_Name, Course_Name_Alt, Major, Professor",
    )
    .or("Professor.is.null,Professor.eq.,Professor.eq.N/A")
    .order("Major", { ascending: true })
    .order("Course_Code", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function assignCourseToFaculty(
  facultyId: number,
  courseId: number,
) {
  const { error } = await supabase.from("Faculty_Courses").insert([
    {
      Faculty_Id: facultyId,
      Course_Id: courseId,
    },
  ]);

  if (error) throw new Error(error.message);
}
