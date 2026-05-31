"use client";

import { FormEvent, useMemo, useState } from "react";

type SchoolCandidate = {
  schoolName: string;
  neisSchoolCode: string;
  schoolInfoCode: string;
  officeCode: string;
  level: string;
  address: string;
  foundationType?: string;
  coedType?: string;
};

type TeacherCountTrend = {
  year: number;
  subject: string;
  teacherCount: number;
  changeFromPreviousYear: number | null;
};

type TimetableRecord = {
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

type SubjectHoursSummary = {
  subject: string;
  totalHours: number;
  years: string;
  grades: string;
  classes: string;
  teachers: string;
};

type Analysis = {
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
  subjectGradeAssignments: Array<{
    subject: string;
    grades: string;
    totalHours: number;
  }>;
};

const DEFAULT_YEARS = [2025, 2024, 2023];

function formatDelta(value: number | null) {
  if (value === null) return "-";
  if (value === 0) return "변화 없음";
  return `${value > 0 ? "+" : ""}${value}`;
}

function DataTable<T>({
  rows,
  empty,
  columns,
  rowKey,
}: {
  rows: T[];
  empty: string;
  columns: Array<{ label: string; render: (row: T) => React.ReactNode }>;
  rowKey: (row: T, index: number) => string;
}) {
  if (rows.length === 0) {
    return <div className="empty">{empty}</div>;
  }

  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.label}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)}>
              {columns.map((column) => (
                <td key={column.label}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [schools, setSchools] = useState<SchoolCandidate[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolCandidate | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [message, setMessage] = useState("학교명을 두 글자 이상 입력해 검색하세요.");

  const filteredTimetable = useMemo(() => {
    if (!analysis) return [];
    const normalized = subjectFilter.trim();
    if (!normalized) return analysis.timetable.slice(0, 150);
    return analysis.timetable
      .filter((row) => row.subject.includes(normalized) || row.subjectGroup.includes(normalized))
      .slice(0, 150);
  }, [analysis, subjectFilter]);

  async function searchSchools(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSearching(true);
    setAnalysis(null);
    setSelectedSchool(null);
    setMessage("학교 목록을 찾는 중입니다.");

    try {
      const response = await fetch(`/api/schools/search?q=${encodeURIComponent(query)}`);
      const data = (await response.json()) as { schools: SchoolCandidate[] };
      setSchools(data.schools);
      setMessage(data.schools.length ? "분석할 학교를 선택하세요." : "검색 결과가 없습니다.");
    } catch {
      setMessage("학교 검색 중 오류가 발생했습니다.");
    } finally {
      setIsSearching(false);
    }
  }

  async function analyzeSchool(school: SchoolCandidate) {
    setSelectedSchool(school);
    setAnalysis(null);
    setIsAnalyzing(true);
    setMessage("학교알리미와 NEIS 데이터를 수집하고 분석하는 중입니다.");

    try {
      const response = await fetch("/api/schools/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school, years: DEFAULT_YEARS }),
      });

      if (!response.ok) {
        throw new Error("analysis failed");
      }

      const result = (await response.json()) as Analysis;
      setAnalysis(result);
      setMessage("분석이 완료되었습니다.");
    } catch {
      setMessage("분석 중 오류가 발생했습니다. API 키와 공시/시간표 제공 여부를 확인해 주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <main className="page">
      <header className="topbar">
        <div>
          <strong>CycleON AI</strong>
          <span>학교 공시·시간표 분석 MVP</span>
        </div>
      </header>

      <section className="searchBand">
        <div>
          <p className="eyebrow">School Data Analyzer</p>
          <h1>학교 이름으로 과목별 교원수와 시간표 시수를 분석합니다.</h1>
        </div>
        <form className="searchForm" onSubmit={searchSchools}>
          <input
            aria-label="학교 이름"
            placeholder="예: 대전관평중학교"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" disabled={isSearching || query.trim().length < 2}>
            {isSearching ? "검색 중" : "검색"}
          </button>
        </form>
        <p className="message">{message}</p>
      </section>

      <section className="schoolGrid" aria-label="학교 검색 결과">
        {schools.map((school) => (
          <button
            className={`schoolItem ${selectedSchool?.schoolInfoCode === school.schoolInfoCode ? "selected" : ""}`}
            key={school.schoolInfoCode}
            type="button"
            onClick={() => analyzeSchool(school)}
          >
            <strong>{school.schoolName}</strong>
            <span>{school.address || "주소 정보 없음"}</span>
            <small>
              NEIS {school.neisSchoolCode} · 학교알리미 {school.schoolInfoCode}
            </small>
          </button>
        ))}
      </section>

      {isAnalyzing ? <div className="loading">API 데이터를 불러오는 중입니다. 과거 연도와 학기별 시간표를 순차 조회합니다.</div> : null}

      {analysis ? (
        <div className="analysis">
          <section className="summaryGrid">
            <article>
              <span>분석 학교</span>
              <strong>{analysis.school.schoolName}</strong>
              <p>{analysis.school.address}</p>
            </article>
            <article>
              <span>학교알리미 교원수 행</span>
              <strong>{analysis.sourceStatus.schoolInfoTeacherRows.toLocaleString()}건</strong>
              <p>과목별 교원수 연도 추이 계산</p>
            </article>
            <article>
              <span>NEIS 시간표 행</span>
              <strong>{analysis.sourceStatus.neisTimetableRows.toLocaleString()}건</strong>
              <p>학기·학급·교사별 시간표 기반 시수 집계</p>
            </article>
            <article>
              <span>과목 시수 통계</span>
              <strong>{analysis.subjectHourStats.totalHours.toLocaleString()}시수</strong>
              <p>{analysis.subjectHourStats.subjectCount}개 과목 집계</p>
            </article>
          </section>

          {analysis.sourceStatus.notes.length ? (
            <section className="notice">
              {analysis.sourceStatus.notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </section>
          ) : null}

          <section className="section">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">SchoolInfo</p>
                <h2>과목별 교원수 연도별 추이</h2>
              </div>
              <span>{analysis.years.join(", ")}년</span>
            </div>
            <DataTable
              rows={analysis.teacherCounts}
              empty="학교알리미에서 해당 학교의 과목별 교원수 데이터를 찾지 못했습니다."
              rowKey={(row) => `${row.year}-${row.subject}`}
              columns={[
                { label: "연도", render: (row) => row.year },
                { label: "과목", render: (row) => row.subject },
                { label: "교원수", render: (row) => `${row.teacherCount}명` },
                { label: "전년 대비", render: (row) => formatDelta(row.changeFromPreviousYear) },
              ]}
            />
          </section>

          <section className="section">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Teacher Quota</p>
                <h2>교사 정원 통계 및 변화 추이</h2>
              </div>
            </div>
            <DataTable
              rows={analysis.teacherQuotaTrend}
              empty="교사 정원 추이를 계산할 데이터가 없습니다."
              rowKey={(row) => String(row.year)}
              columns={[
                { label: "연도", render: (row) => row.year },
                { label: "전체 교원수", render: (row) => `${row.totalTeacherCount}명` },
                { label: "전년 대비", render: (row) => formatDelta(row.changeFromPreviousYear) },
              ]}
            />
          </section>

          <section className="section">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">NEIS Timetable</p>
                <h2>과거 학기별·학급별·교사별 시간표</h2>
              </div>
              <input
                className="subjectInput"
                aria-label="과목 필터"
                placeholder="과목 필터"
                value={subjectFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
              />
            </div>
            <DataTable
              rows={filteredTimetable}
              empty="NEIS 시간표 데이터가 없거나 현재 필터와 일치하는 행이 없습니다."
              rowKey={(row, index) => `${row.year}-${row.semester}-${row.date}-${row.grade}-${row.className}-${row.period}-${index}`}
              columns={[
                { label: "연도", render: (row) => row.year },
                { label: "학기", render: (row) => `${row.semester}학기` },
                { label: "날짜", render: (row) => row.date || "-" },
                { label: "학년", render: (row) => row.grade || "-" },
                { label: "학급", render: (row) => row.className || "-" },
                { label: "교시", render: (row) => row.period || "-" },
                { label: "과목", render: (row) => row.subject },
                { label: "교사", render: (row) => row.teacherName },
              ]}
            />
          </section>

          <section className="section">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Subject Hours</p>
                <h2>시간표 기반 과목별 시수 통계</h2>
              </div>
            </div>
            <div className="statLine">
              <span>최다 시수: {analysis.subjectHourStats.mostHours?.subject || "-"}</span>
              <span>최소 시수: {analysis.subjectHourStats.leastHours?.subject || "-"}</span>
            </div>
            <DataTable
              rows={analysis.subjectHours}
              empty="과목별 시수를 계산할 시간표 데이터가 없습니다."
              rowKey={(row) => row.subject}
              columns={[
                { label: "과목", render: (row) => row.subject },
                { label: "총 시수", render: (row) => `${row.totalHours}시수` },
                { label: "연도", render: (row) => row.years },
                { label: "배정 학년", render: (row) => row.grades },
                { label: "학급", render: (row) => row.classes },
                { label: "교사", render: (row) => row.teachers },
              ]}
            />
          </section>

          <section className="section">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Grade Assignment</p>
                <h2>특정 과목의 학년 배정 현황</h2>
              </div>
            </div>
            <DataTable
              rows={analysis.subjectGradeAssignments}
              empty="학년 배정 현황을 계산할 시간표 데이터가 없습니다."
              rowKey={(row) => row.subject}
              columns={[
                { label: "과목", render: (row) => row.subject },
                { label: "배정 학년", render: (row) => row.grades },
                { label: "근거 시수", render: (row) => `${row.totalHours}시수` },
              ]}
            />
          </section>
        </div>
      ) : null}
    </main>
  );
}
