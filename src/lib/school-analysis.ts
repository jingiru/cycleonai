import { fetchMiddleSchoolTimetable, type NeisMiddleTimetableRow } from "@/lib/api/neis";
import {
  fetchDaejeonMiddleSchoolDisclosure,
  SCHOOLINFO_API_TYPES,
  type SchoolInfoRow,
} from "@/lib/api/schoolInfo";
import { type SchoolCandidate } from "@/lib/school-search";
import { normalizeSubjectName } from "@/lib/subjects/subjectMap";

export type TeacherCountTrend = {
  year: number;
  subject: string;
  teacherCount: number;
  changeFromPreviousYear: number | null;
};

export type TimetableRecord = {
  year: number;
  semester: number;
  date: string;
  grade: string;
  className: string;
  period: string;
  subject: string;
  subjectGroup: string;
  teacherName: string;
};

export type SubjectHoursSummary = {
  subject: string;
  totalHours: number;
  years: string;
  grades: string;
  classes: string;
  teachers: string;
};

export type SubjectGradeAssignment = {
  subject: string;
  grades: string;
  totalHours: number;
};

export type SchoolAnalysis = {
  school: SchoolCandidate;
  years: number[];
  generatedAt: string;
  sourceStatus: {
    schoolInfoTeacherRows: number;
    neisTimetableRows: number;
    notes: string[];
  };
  teacherCounts: TeacherCountTrend[];
  teacherQuotaTrend: Array<{
    year: number;
    totalTeacherCount: number;
    changeFromPreviousYear: number | null;
  }>;
  timetable: TimetableRecord[];
  subjectHours: SubjectHoursSummary[];
  subjectHourStats: {
    mostHours: SubjectHoursSummary | null;
    leastHours: SubjectHoursSummary | null;
    subjectCount: number;
    totalHours: number;
  };
  subjectGradeAssignments: SubjectGradeAssignment[];
};

const SUBJECTS = [
  "국어",
  "수학",
  "영어",
  "사회",
  "역사",
  "도덕",
  "과학",
  "기술·가정",
  "정보",
  "체육",
  "음악",
  "미술",
  "한문",
  "진로와직업",
  "예술",
];

function normalizeCourseContent(content: string) {
  const cleaned = content
    .replace(/\[[^\]]+\]/g, "")
    .replace(/^[^-:：]+[-:：]\s*/, "")
    .trim();
  const normalized = normalizeSubjectName(cleaned);

  if (SUBJECTS.includes(normalized)) {
    return normalized;
  }

  const compact = cleaned.replace(/\s+/g, "");
  const matched = SUBJECTS.find((subject) => compact.includes(subject.replace(/\s+/g, "")));
  return matched || normalized;
}

function isInstructionalSubject(subject: string) {
  return SUBJECTS.includes(subject);
}

function readText(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return "";
}

function readNumber(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value === undefined || value === null || String(value).trim() === "") {
      continue;
    }

    const numberValue = Number(String(value).replace(/,/g, ""));
    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return 0;
}

function isSameSchool(row: SchoolInfoRow, school: SchoolCandidate) {
  const code = String(row.SCHUL_CODE || row.USER_ORG_CODE || "");
  const name = String(row.SCHUL_NM || "");
  return code === school.schoolInfoCode || name === school.schoolName;
}

function parseTeacherRows(year: number, rows: SchoolInfoRow[]): TeacherCountTrend[] {
  const parsed: TeacherCountTrend[] = [];

  for (const rawRow of rows) {
    const row = rawRow as Record<string, unknown>;
    const explicitSubject = readText(row, [
      "SBJT_NM",
      "SBJCT_NM",
      "SUBJECT",
      "SUBJECT_NM",
      "COURSE_NM",
      "TEACH_SUBJ_NM",
      "교과",
      "과목",
    ]);
    const explicitCount = readNumber(row, [
      "SUM_CNT",
      "TEACH_CNT",
      "TCHER_CNT",
      "TEACHER_CNT",
      "정원",
      "교원수",
      "교사수",
      "남",
      "계",
    ]);

    if (explicitSubject) {
      parsed.push({
        year,
        subject: normalizeSubjectName(explicitSubject),
        teacherCount: explicitCount,
        changeFromPreviousYear: null,
      });
      continue;
    }

    for (const subject of SUBJECTS) {
      const count = readNumber(row, [subject, `${subject}교사수`, `${subject}교원수`, `${subject}_CNT`]);
      if (count > 0) {
        parsed.push({
          year,
          subject,
          teacherCount: count,
          changeFromPreviousYear: null,
        });
      }
    }
  }

  const merged = new Map<string, TeacherCountTrend>();
  for (const item of parsed) {
    const key = `${item.year}:${item.subject}`;
    const current = merged.get(key);
    merged.set(key, {
      ...item,
      teacherCount: (current?.teacherCount || 0) + item.teacherCount,
    });
  }

  return [...merged.values()].filter((item) => item.subject && item.teacherCount >= 0);
}

function withTeacherDeltas(rows: TeacherCountTrend[]) {
  const bySubject = new Map<string, TeacherCountTrend[]>();

  for (const row of rows) {
    bySubject.set(row.subject, [...(bySubject.get(row.subject) || []), row]);
  }

  return [...bySubject.values()]
    .flatMap((items) =>
      items
        .sort((a, b) => a.year - b.year)
        .map((item, index, sorted) => ({
          ...item,
          changeFromPreviousYear:
            index === 0 ? null : item.teacherCount - sorted[index - 1].teacherCount,
        })),
    )
    .sort((a, b) => b.year - a.year || a.subject.localeCompare(b.subject, "ko"));
}

function toTimetableRecord(year: number, semester: number, row: NeisMiddleTimetableRow): TimetableRecord {
  const record = row as Record<string, unknown>;
  const subject = readText(record, ["ITRT_CNTNT", "SUBJECT_NM", "SBJCT_NM", "CLASS_NM"]);

  return {
    year,
    semester,
    date: readText(record, ["ALL_TI_YMD"]),
    grade: readText(record, ["GRADE", "GRADE_NM"]),
    className: readText(record, ["CLASS_NM", "CLASS_NO"]),
    period: readText(record, ["PERIO", "PERIOD"]),
    subject: subject || "미분류",
    subjectGroup: normalizeCourseContent(subject || "미분류"),
    teacherName: readText(record, ["TEACHER_NM", "TCHER_NM", "TR_NM", "교사명"]) || "교사명 미제공",
  };
}

function joinValues(values: Iterable<string>) {
  const sorted = [...values].filter(Boolean).sort((a, b) => a.localeCompare(b, "ko", { numeric: true }));
  return sorted.length ? sorted.join(", ") : "-";
}

function summarizeSubjectHours(timetable: TimetableRecord[]): SubjectHoursSummary[] {
  const summary = new Map<
    string,
    {
      totalHours: number;
      years: Set<string>;
      grades: Set<string>;
      classes: Set<string>;
      teachers: Set<string>;
    }
  >();

  for (const row of timetable) {
    const subject = row.subjectGroup || row.subject || "미분류";
    if (!isInstructionalSubject(subject)) {
      continue;
    }
    const current =
      summary.get(subject) ||
      {
        totalHours: 0,
        years: new Set<string>(),
        grades: new Set<string>(),
        classes: new Set<string>(),
        teachers: new Set<string>(),
      };

    current.totalHours += 1;
    current.years.add(String(row.year));
    current.grades.add(row.grade);
    current.classes.add(`${row.grade}-${row.className}`);
    current.teachers.add(row.teacherName);
    summary.set(subject, current);
  }

  return [...summary.entries()]
    .map(([subject, value]) => ({
      subject,
      totalHours: value.totalHours,
      years: joinValues(value.years),
      grades: joinValues(value.grades),
      classes: joinValues(value.classes),
      teachers: joinValues(value.teachers),
    }))
    .sort((a, b) => b.totalHours - a.totalHours || a.subject.localeCompare(b.subject, "ko"));
}

function summarizeSubjectGrades(timetable: TimetableRecord[]): SubjectGradeAssignment[] {
  const gradeMap = new Map<string, { grades: Set<string>; totalHours: number }>();

  for (const row of timetable) {
    const subject = row.subjectGroup || row.subject || "미분류";
    if (!isInstructionalSubject(subject)) {
      continue;
    }
    const current = gradeMap.get(subject) || { grades: new Set<string>(), totalHours: 0 };
    current.grades.add(row.grade);
    current.totalHours += 1;
    gradeMap.set(subject, current);
  }

  return [...gradeMap.entries()]
    .map(([subject, value]) => ({
      subject,
      grades: joinValues([...value.grades].map((grade) => `${grade}학년`)),
      totalHours: value.totalHours,
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject, "ko"));
}

export async function buildSchoolAnalysis(school: SchoolCandidate, years: number[]): Promise<SchoolAnalysis> {
  const notes: string[] = [];
  const teacherRows: TeacherCountTrend[] = [];
  const timetableRows: TimetableRecord[] = [];

  for (const year of years) {
    try {
      const disclosure = await fetchDaejeonMiddleSchoolDisclosure(
        SCHOOLINFO_API_TYPES.teacherBySubject,
        year,
        { depthNo: "20" },
      );
      const schoolRows = disclosure.rows.filter((row) => isSameSchool(row, school));
      teacherRows.push(...parseTeacherRows(year, schoolRows));
    } catch (error) {
      notes.push(`학교알리미 ${year}년 교원수 조회 실패`);
      console.error(error);
    }

    for (const semester of [1, 2]) {
      try {
        const timetable = await fetchMiddleSchoolTimetable({
          officeCode: school.officeCode,
          schoolCode: school.neisSchoolCode,
          year,
          semester,
        });
        timetableRows.push(...timetable.rows.map((row) => toTimetableRecord(year, semester, row)));
      } catch (error) {
        notes.push(`NEIS ${year}년 ${semester}학기 시간표 조회 실패`);
        console.error(error);
      }
    }
  }

  const teacherCounts = withTeacherDeltas(teacherRows);
  const totalByYear = years
    .map((year) => ({
      year,
      totalTeacherCount: teacherCounts
        .filter((row) => row.year === year)
        .reduce((sum, row) => sum + row.teacherCount, 0),
      changeFromPreviousYear: null as number | null,
    }))
    .sort((a, b) => a.year - b.year)
    .map((item, index, sorted) => ({
      ...item,
      changeFromPreviousYear:
        index === 0 ? null : item.totalTeacherCount - sorted[index - 1].totalTeacherCount,
    }))
    .sort((a, b) => b.year - a.year);

  const subjectHours = summarizeSubjectHours(timetableRows);
  const nonZeroSubjects = subjectHours.filter((row) => row.totalHours > 0);

  if (teacherCounts.length === 0) {
    notes.push("학교알리미 과목별 교원수 응답에서 해당 학교 데이터를 찾지 못했습니다.");
  }

  if (timetableRows.length === 0) {
    notes.push("NEIS 시간표 응답에서 해당 기간 데이터를 찾지 못했습니다.");
  }

  return {
    school,
    years,
    generatedAt: new Date().toISOString(),
    sourceStatus: {
      schoolInfoTeacherRows: teacherCounts.length,
      neisTimetableRows: timetableRows.length,
      notes: [...new Set(notes)],
    },
    teacherCounts,
    teacherQuotaTrend: totalByYear,
    timetable: timetableRows.sort(
      (a, b) =>
        b.year - a.year ||
        b.semester - a.semester ||
        a.grade.localeCompare(b.grade, "ko", { numeric: true }) ||
        a.className.localeCompare(b.className, "ko", { numeric: true }) ||
        a.period.localeCompare(b.period, "ko", { numeric: true }),
    ),
    subjectHours,
    subjectHourStats: {
      mostHours: nonZeroSubjects[0] || null,
      leastHours: nonZeroSubjects[nonZeroSubjects.length - 1] || null,
      subjectCount: nonZeroSubjects.length,
      totalHours: nonZeroSubjects.reduce((sum, row) => sum + row.totalHours, 0),
    },
    subjectGradeAssignments: summarizeSubjectGrades(timetableRows),
  };
}
