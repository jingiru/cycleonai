import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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
  source?: "api" | "web";
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

const SCHOOLINFO_WEB_BASE_URL = "https://www.schoolinfo.go.kr";
const TEACHER_BY_SUBJECT_WEB_URL = `${SCHOOLINFO_WEB_BASE_URL}/ei/pp/Pneipp_b11_s0p.do`;
const SCHOOLINFO_WEB_CACHE_DIR = path.join(process.cwd(), "data", "cache");

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

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]*>/g, ""));
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

function mergeTeacherRows(rows: TeacherCountTrend[]) {
  const merged = new Map<string, TeacherCountTrend>();

  for (const item of rows) {
    const key = `${item.year}:${item.subject}`;
    const current = merged.get(key);
    merged.set(key, {
      ...item,
      teacherCount: (current?.teacherCount || 0) + item.teacherCount,
    });
  }

  return [...merged.values()].filter((item) => item.subject && item.teacherCount >= 0);
}

function parseTeacherRows(year: number, rows: SchoolInfoRow[], source: "api" | "web" = "api"): TeacherCountTrend[] {
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
        source,
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
          source,
        });
      }
    }
  }

  return mergeTeacherRows(parsed);
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

async function readCache<T>(cacheKey: string): Promise<T | null> {
  try {
    const content = await readFile(path.join(SCHOOLINFO_WEB_CACHE_DIR, `${cacheKey}.json`), "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

async function writeCache(cacheKey: string, data: unknown) {
  await mkdir(SCHOOLINFO_WEB_CACHE_DIR, { recursive: true });
  await writeFile(
    path.join(SCHOOLINFO_WEB_CACHE_DIR, `${cacheKey}.json`),
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );
}

async function postSchoolInfoWeb<T>(pathname: string, params: URLSearchParams): Promise<T> {
  const response = await fetch(`${SCHOOLINFO_WEB_BASE_URL}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Referer: `${SCHOOLINFO_WEB_BASE_URL}/ei/ss/pneiss_a03_s0.do`,
      "User-Agent": "Mozilla/5.0",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`SchoolInfo web request failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  const charset = contentType.match(/charset=([^;]+)/i)?.[1]?.trim().toLowerCase() || "utf-8";
  const buffer = await response.arrayBuffer();
  return new TextDecoder(charset).decode(buffer) as T;
}

function getSchoolInfoWebRegionCodes(school: SchoolCandidate) {
  const address = school.address || "";

  if (address.includes("대전광역시")) {
    const sigunguCodeByName: Record<string, string> = {
      동구: "3011000000",
      중구: "3014000000",
      서구: "3017000000",
      유성구: "3020000000",
      대덕구: "3023000000",
    };
    const sigunguCode = Object.entries(sigunguCodeByName).find(([name]) => address.includes(name))?.[1];

    return {
      sidoCode: "3000000000",
      sigunguCode,
    };
  }

  return {
    sidoCode: "",
    sigunguCode: "",
  };
}

async function findSchoolInfoWebId(school: SchoolCandidate, year: number) {
  const cacheKey = `schoolinfo-web-school-${encodeURIComponent(school.schoolName)}-${year}`;
  const cached = await readCache<{ shlIdfCd: string }>(cacheKey);

  if (cached?.shlIdfCd) {
    return cached.shlIdfCd;
  }

  const regionCodes = getSchoolInfoWebRegionCodes(school);
  const searchParams = new URLSearchParams({
    PNF_YR: String(year),
    GS_HANGMOK_CD: "11",
    JG_HANGMOK_CD: "24",
    HG_JONGRYU_GB: "03",
    SIDO_CODE: regionCodes.sidoCode,
    SIGUNGU_CODE: regionCodes.sigunguCode || "",
  });

  searchParams.append("SULRIP_GB", "1");
  searchParams.append("SULRIP_GB", "2");
  searchParams.append("SULRIP_GB", "3");

  const locationResult = await postSchoolInfoWeb<{
    schoolList?: Array<{ SHL_NM?: string; SHL_IDF_CD?: string; SHL_CD?: string }>;
  }>(
    "/ei/ss/pneiss_a05_s0/selectSchoolListLocation.do",
    searchParams,
  );
  const schoolCodeTail = school.schoolInfoCode.replace(/^S0*/, "");
  let matchedSchool =
    locationResult.schoolList?.find((item) => item.SHL_NM === school.schoolName) ||
    locationResult.schoolList?.find((item) => item.SHL_CD?.endsWith(schoolCodeTail));

  if (!matchedSchool?.SHL_IDF_CD) {
    const schools = await postSchoolInfoWeb<Array<{ SHL_NM?: string; SHL_IDF_CD?: string }>>(
      "/ei/ss/pneiss_a04_s0/getSchoolList.do",
      new URLSearchParams({ SEARCH_WORD: school.schoolName }),
    );
    matchedSchool = schools.find((item) => item.SHL_NM === school.schoolName) || schools[0];
  }

  const shlIdfCd = matchedSchool?.SHL_IDF_CD;

  if (!shlIdfCd) {
    throw new Error(`SchoolInfo web school id not found: ${school.schoolName}`);
  }

  await writeCache(cacheKey, { schoolName: school.schoolName, year, shlIdfCd });
  return shlIdfCd;
}

function parseTeacherRowsFromWebHtml(year: number, html: string): TeacherCountTrend[] {
  const captionIndex = html.indexOf("<caption>과목별 교원 현황</caption>");
  if (captionIndex < 0) {
    return [];
  }

  const tableStart = html.lastIndexOf("<table", captionIndex);
  const tableEnd = html.indexOf("</table>", captionIndex);
  if (tableStart < 0 || tableEnd < 0) {
    return [];
  }

  const tableHtml = html.slice(tableStart, tableEnd + "</table>".length);
  const rows: TeacherCountTrend[] = [];
  const rowMatches = tableHtml.matchAll(/<tr[\s\S]*?<\/tr>/gi);

  for (const rowMatch of rowMatches) {
    const cellMatches = [...rowMatch[0].matchAll(/<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)];
    const cells = cellMatches.map((match) => stripTags(match[1]));

    if (cells.length < 5 || cells[0] === "교과" || cells[1] === "과목" || cells[0].includes("총")) {
      continue;
    }

    const subject = normalizeSubjectName(cells[1]);
    const teacherCount = Number(cells[4].replace(/,/g, ""));

    if (subject && Number.isFinite(teacherCount)) {
      rows.push({
        year,
        subject,
        teacherCount,
        changeFromPreviousYear: null,
        source: "web",
      });
    }
  }

  return mergeTeacherRows(rows);
}

async function fetchTeacherRowsFromSchoolInfoWeb(
  school: SchoolCandidate,
  year: number,
): Promise<TeacherCountTrend[]> {
  const cacheKey = `schoolinfo-web-teacher-subject-${school.schoolInfoCode}-${year}`;
  const cached = await readCache<{ rows: TeacherCountTrend[] }>(cacheKey);

  if (cached?.rows?.length) {
    return cached.rows;
  }

  const shlIdfCd = await findSchoolInfoWebId(school, year);
  const html = await postSchoolInfoWeb<string>(
    "/ei/pp/Pneipp_b11_s0p.do",
    new URLSearchParams({
      GS_HANGMOK_CD: "11",
      GS_HANGMOK_NO: "6-나-2",
      GS_HANGMOK_NM: "표시과목별 교원 현황",
      GS_BURYU_CD: "JG060",
      JG_BURYU_CD: "JG060",
      JG_HANGMOK_CD: "24",
      JG_GUBUN: "1",
      JG_YEAR2: String(year),
      SHL_IDF_CD: shlIdfCd,
      GS_TYPE: "Y",
      JG_YEAR: String(year),
      CHOSEN_JG_YEAR: String(year),
      PRE_JG_YEAR: String(year),
    }),
  );
  const rows = parseTeacherRowsFromWebHtml(year, html);

  if (rows.length > 0) {
    await writeCache(cacheKey, {
      schoolName: school.schoolName,
      schoolInfoCode: school.schoolInfoCode,
      year,
      source: "schoolinfo-web",
      fetchedAt: new Date().toISOString(),
      rows,
    });
  }

  return rows;
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
    let apiTeacherRows: TeacherCountTrend[] = [];

    try {
      const disclosure = await fetchDaejeonMiddleSchoolDisclosure(
        SCHOOLINFO_API_TYPES.teacherBySubject,
        year,
        { depthNo: "20" },
      );
      const schoolRows = disclosure.rows.filter((row) => isSameSchool(row, school));
      apiTeacherRows = parseTeacherRows(year, schoolRows, "api");
    } catch (error) {
      notes.push(`학교알리미 ${year}년 교원수 조회 실패`);
      console.error(error);
    }

    if (apiTeacherRows.length > 0) {
      teacherRows.push(...apiTeacherRows);
    } else {
      try {
        const webTeacherRows = await fetchTeacherRowsFromSchoolInfoWeb(school, year);
        teacherRows.push(...webTeacherRows);

        if (webTeacherRows.length > 0) {
          notes.push(`학교알리미 ${year}년 교원수는 API 미반영으로 웹 공시 데이터를 사용했습니다.`);
        }
      } catch (error) {
        notes.push(`학교알리미 ${year}년 웹 공시 교원수 조회 실패`);
        console.error(error);
      }
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
