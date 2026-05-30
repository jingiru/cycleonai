import fs from "node:fs";
import path from "node:path";

import {
  type CircuitRequest,
  type PreviousAssignment,
  type SchoolLocation,
  type TeacherCapacity,
  scoreMatch,
} from "@/lib/matching/score";

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

type RecommendationRow = {
  requestId: string;
  requestSchool: string;
  subject: string;
  grade: number;
  requestedHours: number;
  teacherId: string;
  homeSchool: string;
  total: number;
  distanceKm: number | null;
  reason: string;
};

function readSchoolMaster(): SchoolMasterRow[] {
  const filePath = path.join(process.cwd(), "data", "processed", "school_master.json");

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("[page] failed to read school_master.json", error);
    return [];
  }
}

function readSampleJsonArray<T>(fileName: string): T[] {
  const filePath = path.join(process.cwd(), "data", "sample", fileName);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    console.error(`[page] failed to read data/sample/${fileName}`, error);
    return [];
  }
}

function buildSchoolLocationMap(schools: SchoolMasterRow[]): Map<string, SchoolLocation> {
  return new Map(
    schools.map((school) => [
      school.schoolName,
      {
        schoolName: school.schoolName,
        latitude: school.latitude,
        longitude: school.longitude,
      },
    ]),
  );
}

function buildRecommendations(schools: SchoolMasterRow[]): RecommendationRow[] {
  const requests = readSampleJsonArray<CircuitRequest>("circuit_requests.json");
  const teachers = readSampleJsonArray<TeacherCapacity>("teacher_capacity.json");
  const previousAssignments = readSampleJsonArray<PreviousAssignment>("previous_assignments.json");
  const schoolLocations = buildSchoolLocationMap(schools);

  return requests
    .flatMap((request) =>
      teachers
        .filter(
          (teacher) =>
            teacher.subject === request.subject &&
            teacher.availableWeeklyHours > 0 &&
            teacher.availableWeeklyHours >= Math.min(request.requestedHours, 2),
        )
        .map((teacher) => {
          const score = scoreMatch({
            request,
            teacher,
            previousAssignments,
            requestSchool: schoolLocations.get(request.requestSchool),
            teacherSchool: schoolLocations.get(teacher.homeSchool),
          });

          return {
            requestId: request.requestId,
            requestSchool: request.requestSchool,
            subject: request.subject,
            grade: request.grade,
            requestedHours: request.requestedHours,
            teacherId: teacher.teacherId,
            homeSchool: teacher.homeSchool,
            total: score.total,
            distanceKm: score.distanceKm,
            reason: request.reason,
          };
        }),
    )
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

export default function Home() {
  const schools = readSchoolMaster();
  const samples = schools.slice(0, 5);
  const recommendations = buildRecommendations(schools);

  return (
    <main className="page">
      <section className="summary">
        <p className="eyebrow">대전 지역 중학교</p>
        <h1>교육 공공데이터 수집 현황</h1>
        {schools.length > 0 ? (
          <p className="lead">
            현재 정규화된 학교 기본정보 <strong>{schools.length.toLocaleString("ko-KR")}</strong>건을
            확인했습니다.
          </p>
        ) : (
          <p className="lead">아직 수집된 데이터가 없습니다. npm run fetch:schools를 먼저 실행하세요.</p>
        )}
      </section>

      {samples.length > 0 ? (
        <section className="tableSection" aria-label="학교 기본정보 샘플">
          <table>
            <thead>
              <tr>
                <th>학교명</th>
                <th>NEIS 코드</th>
                <th>학교알리미 코드</th>
                <th>구분</th>
                <th>설립</th>
                <th>남녀공학</th>
                <th>주소</th>
              </tr>
            </thead>
            <tbody>
              {samples.map((school) => (
                <tr key={school.neisSchoolCode}>
                  <td>{school.schoolName}</td>
                  <td>{school.neisSchoolCode}</td>
                  <td>{school.schoolInfoCode || "-"}</td>
                  <td>{school.level}</td>
                  <td>{school.foundationType || "-"}</td>
                  <td>{school.coedType || "-"}</td>
                  <td>{school.address || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="nextStep">
        <div className="sectionHeader">
          <p className="eyebrow">MVP 추천 엔진</p>
          <h2>다음 단계: 순회 배치 추천 MVP 준비 중</h2>
          <p className="sectionLead">
            샘플 내부 입력 데이터를 기준으로 교과, 학년, 전년도 연속성, 시수 여유, 담임 부담,
            학교 간 거리를 종합해 추천 후보를 계산합니다.
          </p>
        </div>

        {recommendations.length > 0 ? (
          <div className="tableSection" aria-label="순회 배치 추천 샘플">
            <table>
              <thead>
                <tr>
                  <th>요청</th>
                  <th>요청 학교</th>
                  <th>교과</th>
                  <th>학년</th>
                  <th>시수</th>
                  <th>추천 교사</th>
                  <th>소속교</th>
                  <th>거리</th>
                  <th>점수</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((recommendation) => (
                  <tr key={`${recommendation.requestId}-${recommendation.teacherId}`}>
                    <td>{recommendation.requestId}</td>
                    <td>{recommendation.requestSchool}</td>
                    <td>{recommendation.subject}</td>
                    <td>{recommendation.grade}학년</td>
                    <td>{recommendation.requestedHours}시간</td>
                    <td>{recommendation.teacherId}</td>
                    <td>{recommendation.homeSchool}</td>
                    <td>
                      {recommendation.distanceKm === null ? "-" : `${recommendation.distanceKm.toFixed(1)}km`}
                    </td>
                    <td>
                      <strong>{recommendation.total}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="emptyText">추천 결과를 계산할 샘플 데이터가 없습니다.</p>
        )}
      </section>
    </main>
  );
}
