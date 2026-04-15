import { supabase } from "../Database/supabaseClient.js";

export type HistoryRow = {
  id: number;
  Date: string;
  CourseName: string;
  CourseCode: string;
  TalkingPoint: string;
};

type StudentHistoryRow = {
  Student_id: number;
  History_id: number;
};

function cleanTalkingPoints(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => String(value ?? "").trim())
    .filter((value) => value.length > 0);
}

export async function saveTalkingPointsForStudent(
  reqStudentId: number,
  reqCourseCode: string,
  reqCourseName: string,
  reqTalkingPoints: string[],
) {
  // We renamed the incoming parameters above so we can safely declare our formatted variables here
  const studentId = Number(reqStudentId);
  const courseName = String(reqCourseName ?? "").trim();
  const courseCode = String(reqCourseCode ?? "")
    .trim()
    .toUpperCase();
  const talkingPoints = cleanTalkingPoints(reqTalkingPoints);

  if (!Number.isInteger(studentId) || studentId <= 0) {
    throw new Error("Invalid studentId");
  }

  if (!courseName) {
    throw new Error("courseName is required");
  }

  if (!courseCode) {
    throw new Error("courseCode is required");
  }

  if (talkingPoints.length === 0) {
    throw new Error("At least one talking point is required");
  }

  // 🔥 include CourseCode here
  const historyPayload = talkingPoints.map((point) => ({
    CourseName: courseName,
    CourseCode: courseCode,
    TalkingPoint: point,
  }));

  const { data: insertedHistory, error: historyInsertError } = await supabase
    .from("History")
    .insert(historyPayload)
    .select("id, Date, CourseName, CourseCode, TalkingPoint");

  if (historyInsertError) throw historyInsertError;

  const historyRows = insertedHistory ?? [];

  // map to student
  const studentHistoryPayload = historyRows.map((row) => ({
    Student_id: studentId,
    History_id: row.id,
  }));

  const { error: joinInsertError } = await supabase
    .from("Student_History")
    .insert(studentHistoryPayload);

  if (joinInsertError) throw joinInsertError;

  return historyRows;
}
export async function getHistoryForStudent(studentId: number) {
  if (!Number.isInteger(studentId) || studentId <= 0) {
    throw new Error("Invalid studentId");
  }

  const { data, error } = await supabase
    .from("Student_History")
    .select(
      `
      Student_id,
      History_id,
      History (
        id,
        Date,
        CourseName,
        CourseCode,
        TalkingPoint
      )
    `,
    )
    .eq("Student_id", studentId);

  if (error) throw error;

  const rows = (data ?? [])
    .map((row: any) => row.History)
    .filter(Boolean)
    .sort(
      (a: HistoryRow, b: HistoryRow) =>
        new Date(b.Date).getTime() - new Date(a.Date).getTime(),
    );

  return rows as HistoryRow[];
}

export async function deleteHistoryEntryForStudent(
  studentId: number,
  historyId: number,
) {
  if (!Number.isInteger(studentId) || studentId <= 0) {
    throw new Error("Invalid studentId");
  }

  if (!Number.isInteger(historyId) || historyId <= 0) {
    throw new Error("Invalid historyId");
  }

  // 1) Verify the student actually has this history entry
  const { data: existingLink, error: existingLinkError } = await supabase
    .from("Student_History")
    .select("Student_id, History_id")
    .eq("Student_id", studentId)
    .eq("History_id", historyId)
    .maybeSingle();

  if (existingLinkError) throw existingLinkError;

  if (!existingLink) {
    throw new Error("History entry not found for this student");
  }

  // 2) Delete ALL mappings for this history entry (not just this student)
  const { error: deleteAllMappingsError } = await supabase
    .from("Student_History")
    .delete()
    .eq("History_id", historyId);

  if (deleteAllMappingsError) throw deleteAllMappingsError;

  // 3) Delete the history row itself
  const { error: deleteHistoryError } = await supabase
    .from("History")
    .delete()
    .eq("id", historyId);

  if (deleteHistoryError) throw deleteHistoryError;

  return {
    success: true,
    deletedHistoryId: historyId,
  };
}
