"use client";

import { useMemo, useState } from "react";

import { DataTable, Section, StatusCard } from "@/components/service-components";
import { generateRecommendationExplanation, buildReportSummary } from "@/lib/explanation";
import {
  demandRecords,
  publicDatasets,
  recommendations,
  teacherSupplies,
  travelTimes,
} from "@/lib/mock-data";
import {
  buildDemandRiskRows,
  buildSupplyPotentialRows,
  filterRecommendations,
  getDashboardStats,
  runSimulation,
} from "@/lib/scoring";

const menus = [
  { label: "대시보드", href: "#dashboard" },
  { label: "데이터 관리", href: "#data" },
  { label: "순회교사 분석", href: "#analysis" },
  { label: "AI 배치 추천", href: "#recommendation" },
  { label: "시뮬레이션", href: "#simulation" },
  { label: "보고서", href: "#report" },
];

const uploadTargets = [
  {
    name: "학교별 순회 수요 데이터",
    fields: "school_name, subject, required_hours, reason, priority",
    records: demandRecords.length,
  },
  {
    name: "교사 공급 가능 데이터",
    fields: "teacher_id, teacher_name, base_school, subject, available_hours, preferred_area, can_travel",
    records: teacherSupplies.length,
  },
  {
    name: "학교 간 이동시간 데이터",
    fields: "from_school, to_school, travel_minutes, distance_km",
    records: travelTimes.length,
  },
];

function scoreBadge(score: number) {
  const tone = score >= 85 ? "good" : score >= 70 ? "caution" : "danger";
  return <span className={`scoreBadge ${tone}`}>{score}</span>;
}

function deltaLabel(value: number, reverse = false) {
  if (value === 0) return <span className="delta neutral">변화 없음</span>;

  const improved = reverse ? value < 0 : value > 0;
  return <span className={`delta ${improved ? "up" : "down"}`}>{value > 0 ? "+" : ""}{value}</span>;
}

export default function Home() {
  const [maxSchoolsPerTeacher, setMaxSchoolsPerTeacher] = useState(2);
  const [maxWeeklyHours, setMaxWeeklyHours] = useState(20);
  const [travelLimitMinutes, setTravelLimitMinutes] = useState(30);
  const [preferSameArea, setPreferSameArea] = useState(true);
  const [preferPreferredTeachers, setPreferPreferredTeachers] = useState(true);
  const [excludeNewTeachers, setExcludeNewTeachers] = useState(false);
  const [studentDeclineRate, setStudentDeclineRate] = useState(3);
  const [subjectDemandIncreaseRate, setSubjectDemandIncreaseRate] = useState(8);
  const [newTeacherCount, setNewTeacherCount] = useState(1);
  const [simulationMaxSchools, setSimulationMaxSchools] = useState(2);
  const [simulationTravelLimit, setSimulationTravelLimit] = useState(30);

  const demandRows = useMemo(() => buildDemandRiskRows(), []);
  const supplyRows = useMemo(() => buildSupplyPotentialRows(), []);
  const dashboardStats = useMemo(() => getDashboardStats(), []);
  const recommendationRows = useMemo(
    () =>
      filterRecommendations({
        maxSchoolsPerTeacher,
        maxWeeklyHours,
        travelLimitMinutes,
        preferSameArea,
        preferPreferredTeachers,
        excludeNewTeachers,
      }),
    [
      excludeNewTeachers,
      maxSchoolsPerTeacher,
      maxWeeklyHours,
      preferPreferredTeachers,
      preferSameArea,
      travelLimitMinutes,
    ],
  );
  const simulation = useMemo(
    () =>
      runSimulation({
        studentDeclineRate,
        subjectDemandIncreaseRate,
        newTeacherCount,
        maxSchoolsPerTeacher: simulationMaxSchools,
        travelLimitMinutes: simulationTravelLimit,
      }),
    [newTeacherCount, simulationMaxSchools, simulationTravelLimit, studentDeclineRate, subjectDemandIncreaseRate],
  );
  const reportSummary = useMemo(
    () =>
      buildReportSummary({
        riskySubjects: demandRows.slice(0, 4).map((row) => `${row.school} ${row.subject}`),
        topRecommendation: recommendationRows[0] ?? recommendations[0],
      }),
    [demandRows, recommendationRows],
  );

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="#dashboard" aria-label="순회ON AI 홈">
          순회ON AI
        </a>
        <nav aria-label="주요 메뉴">
          {menus.map((menu) => (
            <a key={menu.href} href={menu.href}>
              {menu.label}
            </a>
          ))}
        </nav>
      </header>

      <section className="hero" id="dashboard">
        <p className="eyebrow">순회교사 배치 의사결정 지원</p>
        <h1>순회ON AI</h1>
        <p className="subtitle">
          공공데이터와 장학사 입력 데이터를 결합한 순회교사 AI 배치 의사결정 지원 서비스
        </p>
        <div className="heroPanel">
          <strong>서비스 흐름</strong>
          <span>공공데이터 수집/관리</span>
          <span>장학사 업로드</span>
          <span>수요·공급 분석</span>
          <span>AI 배치 추천</span>
          <span>시뮬레이션</span>
          <span>보고서 생성</span>
        </div>
      </section>

      <Section
        id="dashboard-status"
        eyebrow="Dashboard"
        title="데이터 준비 상태"
        description="현재 분석과 추천에 사용할 수 있는 데이터의 준비 정도를 한눈에 확인합니다."
      >
        <div className="statusGrid">
          {dashboardStats.map((stat) => (
            <StatusCard key={stat.label} {...stat} />
          ))}
        </div>
      </Section>

      <Section
        id="data"
        eyebrow="Data Management"
        title="공공데이터와 장학사 입력 데이터 관리"
        description="실제 API를 새로 지어내지 않고, 현재는 mock import로 업로드·검증·반영 흐름을 시연합니다."
      >
        <div className="splitGrid">
          <div className="panel">
            <div className="panelHeader">
              <h3>공공데이터</h3>
              <span>수집 상태</span>
            </div>
            <div className="datasetList">
              {publicDatasets.map((dataset) => (
                <article className="datasetItem" key={dataset.id}>
                  <div>
                    <strong>{dataset.name}</strong>
                    <p>{dataset.description}</p>
                    <small>{dataset.source} · {dataset.lastUpdated}</small>
                  </div>
                  <span className={`state ${dataset.status}`}>{dataset.records}건</span>
                </article>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panelHeader">
              <h3>장학사 입력 데이터</h3>
              <span>업로드 → 검증 → 반영</span>
            </div>
            <div className="uploadList">
              {uploadTargets.map((target) => (
                <article className="uploadCard" key={target.name}>
                  <div>
                    <strong>{target.name}</strong>
                    <p>{target.fields}</p>
                  </div>
                  <div className="uploadFlow" aria-label="업로드 처리 단계">
                    <span>업로드</span>
                    <span>검증</span>
                    <span>반영</span>
                  </div>
                  <button type="button">mock import {target.records}건</button>
                </article>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section
        id="analysis"
        eyebrow="Analysis"
        title="순회 수요·공급 분석"
        description="장학사 입력 데이터와 공공데이터를 결합해 위험도와 공급 적합도를 계산합니다."
      >
        <div className="stack">
          <div>
            <h3>순회 수요 위험도 상위 과목</h3>
            <DataTable
              rows={demandRows.slice(0, 10)}
              getRowKey={(row) => `${row.school}-${row.subject}`}
              columns={[
                { key: "school", label: "학교" },
                { key: "subject", label: "과목" },
                { key: "requiredHours", label: "필요 시수", render: (row) => `${row.requiredHours}시간` },
                { key: "availableInSchoolHours", label: "교내 확보 가능 시수", render: (row) => `${row.availableInSchoolHours}시간` },
                { key: "shortageHours", label: "부족 시수", render: (row) => `${row.shortageHours}시간` },
                { key: "riskScore", label: "위험도 점수", render: (row) => scoreBadge(row.riskScore) },
                { key: "reason", label: "판단 근거" },
              ]}
            />
          </div>

          <div>
            <h3>순회 공급 가능성 상위 교사/과목</h3>
            <DataTable
              rows={supplyRows.slice(0, 10)}
              getRowKey={(row) => `${row.teacher}-${row.subject}`}
              columns={[
                { key: "teacher", label: "교사" },
                { key: "baseSchool", label: "소속교" },
                { key: "subject", label: "과목" },
                { key: "availableHours", label: "가능 시수", render: (row) => `${row.availableHours}시간` },
                { key: "recommendedSchoolCount", label: "추천 가능 학교 수", render: (row) => `${row.recommendedSchoolCount}개` },
                { key: "averageTravelMinutes", label: "평균 이동시간", render: (row) => `${row.averageTravelMinutes}분` },
                { key: "fitScore", label: "공급 적합도", render: (row) => scoreBadge(row.fitScore) },
                { key: "reason", label: "판단 근거" },
              ]}
            />
          </div>
        </div>
      </Section>

      <Section
        id="recommendation"
        eyebrow="AI Recommendation"
        title="AI 배치 추천"
        description="LLM API 없이 deterministic explanation generator로 조건 기반 추천 설명을 생성합니다."
      >
        <div className="recommendationLayout">
          <aside className="controlPanel">
            <h3>입력 조건</h3>
            <label>
              순회학교 최대 개수
              <input type="number" min={1} max={4} value={maxSchoolsPerTeacher} onChange={(event) => setMaxSchoolsPerTeacher(Number(event.target.value))} />
            </label>
            <label>
              교사 주당 최대 수업시수
              <input type="number" min={10} max={24} value={maxWeeklyHours} onChange={(event) => setMaxWeeklyHours(Number(event.target.value))} />
            </label>
            <label>
              평균 이동시간 제한
              <input type="number" min={10} max={60} value={travelLimitMinutes} onChange={(event) => setTravelLimitMinutes(Number(event.target.value))} />
            </label>
            <label className="check"><input type="checkbox" checked={preferSameArea} onChange={(event) => setPreferSameArea(event.target.checked)} /> 동일 생활권 우선</label>
            <label className="check"><input type="checkbox" checked={preferPreferredTeachers} onChange={(event) => setPreferPreferredTeachers(event.target.checked)} /> 희망교사 우선</label>
            <label className="check"><input type="checkbox" checked={excludeNewTeachers} onChange={(event) => setExcludeNewTeachers(event.target.checked)} /> 신규교사 제외</label>
          </aside>

          <div className="recommendationGrid">
            {recommendationRows.map((recommendation, index) => (
              <article className="recommendationCard" key={recommendation.id}>
                <div className="cardTitle">
                  <span>추천안 {index + 1}</span>
                  {scoreBadge(recommendation.fitScore)}
                </div>
                <h3>{recommendation.teacherName} · {recommendation.subject}</h3>
                <dl>
                  <div><dt>소속교</dt><dd>{recommendation.baseSchool}</dd></div>
                  <div><dt>배정 학교</dt><dd>{recommendation.assignedSchools.join(", ")}</dd></div>
                  <div><dt>총 담당 시수</dt><dd>{recommendation.totalHours}시간</dd></div>
                  <div><dt>평균 이동시간</dt><dd>{recommendation.averageTravelMinutes}분</dd></div>
                  <div><dt>해결되는 부족 시수</dt><dd>{recommendation.resolvedShortageHours}시간</dd></div>
                </dl>
                <p>{generateRecommendationExplanation(recommendation)}</p>
              </article>
            ))}
            {recommendationRows.length === 0 ? (
              <article className="emptyState">현재 조건을 만족하는 추천안이 없습니다. 이동시간 또는 최대 학교 수 조건을 완화해 주세요.</article>
            ) : null}
          </div>
        </div>
      </Section>

      <Section
        id="simulation"
        eyebrow="Simulation"
        title="조건 변경 시뮬레이션"
        description="학생 수, 과목 수요, 신규 교사, 이동 조건을 바꿔 배치 결과의 변화를 확인합니다."
      >
        <div className="simulationGrid">
          <div className="controlPanel">
            <h3>시뮬레이션 조건</h3>
            <label>학생 수 감소율 <input type="range" min={0} max={20} value={studentDeclineRate} onChange={(event) => setStudentDeclineRate(Number(event.target.value))} /> <b>{studentDeclineRate}%</b></label>
            <label>특정 과목 수요 증가율 <input type="range" min={0} max={30} value={subjectDemandIncreaseRate} onChange={(event) => setSubjectDemandIncreaseRate(Number(event.target.value))} /> <b>{subjectDemandIncreaseRate}%</b></label>
            <label>신규 교사 추가 수 <input type="number" min={0} max={8} value={newTeacherCount} onChange={(event) => setNewTeacherCount(Number(event.target.value))} /></label>
            <label>순회학교 최대 개수 변경 <input type="number" min={1} max={4} value={simulationMaxSchools} onChange={(event) => setSimulationMaxSchools(Number(event.target.value))} /></label>
            <label>이동시간 제한 변경 <input type="number" min={10} max={60} value={simulationTravelLimit} onChange={(event) => setSimulationTravelLimit(Number(event.target.value))} /></label>
          </div>
          <div className="resultGrid">
            <StatusCard label="예상 순회교사 수" value={`${simulation.expectedCircuitTeachers}명`} status="기존 대비" detail={`${simulation.teacherDelta >= 0 ? "+" : ""}${simulation.teacherDelta}명`} />
            <StatusCard label="미해결 부족 시수" value={`${simulation.unresolvedShortageHours}시간`} status="낮을수록 좋음" detail="기존 대비 " />
            <div className="miniResult">{deltaLabel(simulation.shortageDelta, true)}</div>
            <StatusCard label="평균 이동시간" value={`${simulation.averageTravelMinutes}분`} status="이동 부담" detail="기존 대비" />
            <div className="miniResult">{deltaLabel(simulation.travelDelta, true)}</div>
            <StatusCard label="교사 평균 부담 점수" value={simulation.averageBurdenScore} status="100점 만점" detail="기존 대비" />
            <div className="miniResult">{deltaLabel(simulation.burdenDelta, true)}</div>
          </div>
        </div>
      </Section>

      <Section
        id="report"
        eyebrow="Report"
        title="보고서 미리보기"
        description="현재 분석 결과를 장학사 검토용 보고서 구조로 요약합니다."
      >
        <div className="reportPreview">
          <div className="reportActions">
            <h3>순회교사 AI 배치 분석 보고서</h3>
            <button type="button" disabled>PDF 내보내기 준비중</button>
          </div>
          <article><strong>데이터 출처 요약</strong><p>{reportSummary.sources}</p></article>
          <article><strong>분석 기준</strong><p>{reportSummary.criteria}</p></article>
          <article><strong>주요 위험 과목</strong><p>{reportSummary.risks}</p></article>
          <article><strong>추천 배치안</strong><p>{reportSummary.recommendation}</p></article>
          <article><strong>기대 효과</strong><p>{reportSummary.impact}</p></article>
          <article><strong>한계 및 보완점</strong><p>{reportSummary.limitation}</p></article>
        </div>
      </Section>
    </main>
  );
}
