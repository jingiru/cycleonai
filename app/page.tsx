import fs from "node:fs";
import path from "node:path";

import {
  estimateCircuitDemand,
  estimateCircuitSupply,
  type SubjectHourRecord,
  type TeacherSubjectCountRecord,
} from "@/lib/circuit/estimate";

type SchoolMasterRow = {
  schoolName: string;
  neisSchoolCode: string;
  schoolInfoCode: string;
  level: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  foundationType: string;
  coedType: string;
};

function readDataJsonArray<T>(folder: "processed" | "sample", fileName: string): T[] {
  const filePath = path.join(process.cwd(), "data", folder, fileName);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    console.error(`[page] failed to read data/${folder}/${fileName}`, error);
    return [];
  }
}

function formatNumber(value: number): string {
  return value.toLocaleString("ko-KR");
}

function formatHours(value: number | null): string {
  return value === null ? "-" : `${value.toFixed(1)}시간`;
}

function scoreClassName(score: number): string {
  if (score >= 60) return "score high";
  if (score >= 40) return "score medium";
  return "score";
}

export default function Home() {
  const schools = readDataJsonArray<SchoolMasterRow>("processed", "school_master.json");
  const subjectHours = readDataJsonArray<SubjectHourRecord>("sample", "timetable_subject_hours.json");
  const teacherCounts = readDataJsonArray<TeacherSubjectCountRecord>("sample", "teacher_subject_counts.json");
  const demandEstimates = estimateCircuitDemand(subjectHours, teacherCounts);
  const supplyEstimates = estimateCircuitSupply(subjectHours, teacherCounts);
  const highDemandCount = demandEstimates.filter((estimate) => estimate.demandRiskScore >= 60).length;
  const highSupplyCount = supplyEstimates.filter((estimate) => estimate.supplyPotentialScore >= 55).length;

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">대전 지역 중학교 순회·겸임교사 배치 지원</p>
        <h1>순회ON AI</h1>
        <p className="subtitle">교육청 담당자를 위한 순회·겸임교사 수요 예측 및 배치 지원 서비스</p>
        <p className="lead">
          공공데이터 기반 과거 시간표·교원 현황을 분석하여 신학년도 순회 수요와 공급 가능성을
          사전에 예측합니다. 실제 배치 단계에서는 학교 제출자료를 결합하여 학교별 유출·유입 시수
          균형을 맞추는 다자 간 배치 후보를 추천합니다.
        </p>
      </section>

      <section className="metricGrid" aria-label="데이터 현황">
        <article className="metricCard">
          <span>학교 기본정보</span>
          <strong>{formatNumber(schools.length)}</strong>
          <p>school_master.json</p>
        </article>
        <article className="metricCard">
          <span>시간표 기반 과목 시수 샘플</span>
          <strong>{formatNumber(subjectHours.length)}</strong>
          <p>timetable_subject_hours.json</p>
        </article>
        <article className="metricCard">
          <span>표시과목별 교원 현황 샘플</span>
          <strong>{formatNumber(teacherCounts.length)}</strong>
          <p>teacher_subject_counts.json</p>
        </article>
        <article className="metricCard">
          <span>순회 수요 위험 과목 수</span>
          <strong>{formatNumber(highDemandCount)}</strong>
          <p>위험도 60점 이상</p>
        </article>
        <article className="metricCard">
          <span>순회 공급 가능 과목 수</span>
          <strong>{formatNumber(highSupplyCount)}</strong>
          <p>가능성 55점 이상</p>
        </article>
      </section>

      <section className="section">
        <div className="sectionHeader">
          <p className="eyebrow">데이터 시점</p>
          <h2>공공데이터와 신학년도 제출자료의 역할 구분</h2>
        </div>
        <div className="tableSection">
          <table>
            <thead>
              <tr>
                <th>데이터</th>
                <th>시점</th>
                <th>성격</th>
                <th>활용</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>공공데이터</td>
                <td>전년도 또는 과거 확정 데이터</td>
                <td>학교 위치, 학생 수, 교원 현황, 시간표</td>
                <td>순회 수요·공급 가능성 사전 추정</td>
              </tr>
              <tr>
                <td>학교 제출자료</td>
                <td>신학년도 시작 전 예상 데이터</td>
                <td>순회 요청 과목·시수, 지원 가능 시수</td>
                <td>실제 배치 후보 산정 입력값</td>
              </tr>
              <tr>
                <td>추천 결과</td>
                <td>당해연도 배치 검토자료</td>
                <td>장학사 검토용 후보</td>
                <td>학교별 유출·유입 시수 균형 검토</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <div className="sectionHeader">
          <p className="eyebrow">수요 예측</p>
          <h2>순회 수요 위험도 상위 과목</h2>
        </div>
        <div className="tableSection">
          <table>
            <thead>
              <tr>
                <th>학교</th>
                <th>과목</th>
                <th>추정 주당시수</th>
                <th>교원 수</th>
                <th>학교 평균시수</th>
                <th>수요 위험도</th>
                <th>판단 근거</th>
              </tr>
            </thead>
            <tbody>
              {demandEstimates.slice(0, 10).map((estimate) => (
                <tr key={`${estimate.schoolCode}-${estimate.subjectGroup}-demand`}>
                  <td>{estimate.schoolName}</td>
                  <td>{estimate.subjectGroup}</td>
                  <td>{formatHours(estimate.subjectWeeklyHours)}</td>
                  <td>{estimate.teacherCount}명</td>
                  <td>{formatHours(estimate.schoolAverageHoursPerTeacher)}</td>
                  <td>
                    <span className={scoreClassName(estimate.demandRiskScore)}>
                      {estimate.demandRiskScore}
                    </span>
                  </td>
                  <td>{estimate.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <div className="sectionHeader">
          <p className="eyebrow">공급 예측</p>
          <h2>순회 공급 가능성 상위 과목</h2>
        </div>
        <div className="tableSection">
          <table>
            <thead>
              <tr>
                <th>학교</th>
                <th>과목</th>
                <th>추정 주당시수</th>
                <th>교원 수</th>
                <th>교원 1인당 시수</th>
                <th>공급 가능성</th>
                <th>판단 근거</th>
              </tr>
            </thead>
            <tbody>
              {supplyEstimates.slice(0, 10).map((estimate) => (
                <tr key={`${estimate.schoolCode}-${estimate.subjectGroup}-supply`}>
                  <td>{estimate.schoolName}</td>
                  <td>{estimate.subjectGroup}</td>
                  <td>{formatHours(estimate.subjectWeeklyHours)}</td>
                  <td>{estimate.teacherCount}명</td>
                  <td>{formatHours(estimate.subjectHoursPerTeacher)}</td>
                  <td>
                    <span className={scoreClassName(estimate.supplyPotentialScore)}>
                      {estimate.supplyPotentialScore}
                    </span>
                  </td>
                  <td>{estimate.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <div className="sectionHeader">
          <p className="eyebrow">배치 모델</p>
          <h2>다자 간 시수 균형 문제로 접근</h2>
        </div>
        <div className="balanceGrid">
          <article className="balanceCard">
            <span>유출 시수</span>
            <strong>A학교</strong>
            <p>수학 2시간, 정보 4시간을 순회 지원하면 총 6시간을 외부에서 다시 받아야 합니다.</p>
          </article>
          <article className="balanceCard">
            <span>유입 시수</span>
            <strong>분할 보전</strong>
            <p>B학교 한문 2시간, C학교 한문 2시간, D학교 체육 2시간처럼 여러 학교·여러 교사로 쪼개질 수 있습니다.</p>
          </article>
          <article className="balanceCard">
            <span>추천 관점</span>
            <strong>네트워크 배치</strong>
            <p>학교 간 1:1 매칭이 아니라 학교별 유출·유입 시수 균형을 맞추는 네트워크 배치 문제로 접근합니다.</p>
          </article>
        </div>
      </section>

      <section className="section limitation">
        <div className="sectionHeader">
          <p className="eyebrow">한계 및 보완</p>
          <h2>장학사 검토를 돕는 의사결정 지원 도구</h2>
        </div>
        <ul>
          <li>현재 결과는 공공데이터와 샘플 데이터를 바탕으로 한 사전 예측 MVP입니다.</li>
          <li>실제 순회 배치는 교육청이 수합하는 신학년도 제출자료와 결합해야 합니다.</li>
          <li>학교교육과정 편성표는 공개되어도 HWP/HWPX 비정형 문서인 경우가 많아 자동 분석에 한계가 있습니다.</li>
          <li>본 서비스는 최종 인사 결정을 대체하지 않고 장학사의 검토를 돕는 의사결정 지원 도구입니다.</li>
        </ul>
      </section>
    </main>
  );
}
