import {
  demandRecords,
  recommendations,
  schools,
  teacherSupplies,
  travelTimes,
  type AssignmentRecommendation,
  type DemandRecord,
  type TeacherSupply,
} from "@/lib/mock-data";

export type DemandRiskRow = {
  school: string;
  subject: string;
  requiredHours: number;
  availableInSchoolHours: number;
  shortageHours: number;
  riskScore: number;
  reason: string;
};

export type SupplyPotentialRow = {
  teacher: string;
  baseSchool: string;
  subject: string;
  availableHours: number;
  recommendedSchoolCount: number;
  averageTravelMinutes: number;
  fitScore: number;
  reason: string;
};

export type SimulationInput = {
  studentDeclineRate: number;
  subjectDemandIncreaseRate: number;
  newTeacherCount: number;
  maxSchoolsPerTeacher: number;
  travelLimitMinutes: number;
};

export type SimulationResult = {
  expectedCircuitTeachers: number;
  unresolvedShortageHours: number;
  averageTravelMinutes: number;
  averageBurdenScore: number;
  teacherDelta: number;
  shortageDelta: number;
  travelDelta: number;
  burdenDelta: number;
};

const priorityWeight: Record<DemandRecord["priority"], number> = {
  높음: 22,
  보통: 12,
  낮음: 4,
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function getSchoolArea(schoolName: string): string {
  return schools.find((school) => school.name === schoolName)?.area ?? "";
}

function getTravelMinutes(fromSchool: string, toSchool: string): number {
  if (fromSchool === toSchool) return 0;

  const travel = travelTimes.find(
    (item) =>
      (item.fromSchool === fromSchool && item.toSchool === toSchool) ||
      (item.fromSchool === toSchool && item.toSchool === fromSchool),
  );

  if (travel) return travel.travelMinutes;

  const sameArea = getSchoolArea(fromSchool) && getSchoolArea(fromSchool) === getSchoolArea(toSchool);
  return sameArea ? 18 : 34;
}

function getDemandForSubject(subject: string): DemandRecord[] {
  return demandRecords.filter((record) => record.subject === subject);
}

export function buildDemandRiskRows(): DemandRiskRow[] {
  return demandRecords
    .map((record) => {
      const sameSubjectSupply = teacherSupplies
        .filter((teacher) => teacher.subject === record.subject && teacher.baseSchool === record.schoolName)
        .reduce((sum, teacher) => sum + Math.max(0, teacher.availableHours - 2), 0);
      const availableInSchoolHours = Math.min(record.requiredHours, sameSubjectSupply);
      const shortageHours = Math.max(0, record.requiredHours - availableInSchoolHours);
      const school = schools.find((item) => item.name === record.schoolName);
      const sizePressure = school && school.students > 550 ? 8 : 0;
      const riskScore = clamp(shortageHours * 11 + priorityWeight[record.priority] + sizePressure + 28);

      return {
        school: record.schoolName,
        subject: record.subject,
        requiredHours: record.requiredHours,
        availableInSchoolHours,
        shortageHours,
        riskScore,
        reason: `${record.reason}. ${record.priority} 우선순위와 부족 시수 ${shortageHours}시간을 반영했습니다.`,
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);
}

export function buildSupplyPotentialRows(): SupplyPotentialRow[] {
  return teacherSupplies
    .map((teacher) => {
      const candidateDemands = getDemandForSubject(teacher.subject).filter(
        (record) => record.schoolName !== teacher.baseSchool,
      );
      const candidateTravel = candidateDemands.map((record) => getTravelMinutes(teacher.baseSchool, record.schoolName));
      const averageTravelMinutes =
        candidateTravel.length > 0
          ? round(candidateTravel.reduce((sum, minutes) => sum + minutes, 0) / candidateTravel.length)
          : 0;
      const recommendedSchoolCount = candidateDemands.filter(
        (record) => getTravelMinutes(teacher.baseSchool, record.schoolName) <= 30,
      ).length;
      const travelScore = clamp(100 - averageTravelMinutes * 1.8);
      const capacityScore = clamp(teacher.availableHours * 10);
      const mobilityScore = teacher.canTravel ? 15 : -20;
      const newTeacherPenalty = teacher.isNewTeacher ? -12 : 0;
      const fitScore = clamp(travelScore * 0.35 + capacityScore * 0.45 + recommendedSchoolCount * 7 + mobilityScore + newTeacherPenalty);

      return {
        teacher: teacher.teacherName,
        baseSchool: teacher.baseSchool,
        subject: teacher.subject,
        availableHours: teacher.availableHours,
        recommendedSchoolCount,
        averageTravelMinutes,
        fitScore: round(fitScore),
        reason: `${candidateDemands.length}개 수요 학교 중 ${recommendedSchoolCount}개가 30분 이내이며, 가용 ${teacher.availableHours}시간을 반영했습니다.`,
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore);
}

export function filterRecommendations(input: {
  maxSchoolsPerTeacher: number;
  maxWeeklyHours: number;
  travelLimitMinutes: number;
  preferSameArea: boolean;
  preferPreferredTeachers: boolean;
  excludeNewTeachers: boolean;
}): AssignmentRecommendation[] {
  return recommendations
    .filter((recommendation) => recommendation.assignedSchools.length <= input.maxSchoolsPerTeacher)
    .filter((recommendation) => recommendation.totalHours <= input.maxWeeklyHours)
    .filter((recommendation) => recommendation.averageTravelMinutes <= input.travelLimitMinutes)
    .filter((recommendation) => {
      if (!input.excludeNewTeachers) return true;
      const teacher = teacherSupplies.find((item) => item.teacherId === recommendation.teacherId);
      return !teacher?.isNewTeacher;
    })
    .map((recommendation) => {
      const teacher = teacherSupplies.find((item) => item.teacherId === recommendation.teacherId);
      const sameAreaBonus =
        input.preferSameArea && teacher
          ? recommendation.assignedSchools.filter((school) => getSchoolArea(school) === teacher.preferredArea).length * 3
          : 0;
      const preferredBonus = input.preferPreferredTeachers && teacher?.canTravel ? 4 : 0;

      return {
        ...recommendation,
        fitScore: clamp(recommendation.fitScore + sameAreaBonus + preferredBonus),
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore);
}

export function runSimulation(input: SimulationInput): SimulationResult {
  const totalDemandHours = demandRecords.reduce((sum, record) => sum + record.requiredHours, 0);
  const adjustedDemand = totalDemandHours * (1 - input.studentDeclineRate / 100) * (1 + input.subjectDemandIncreaseRate / 100);
  const availableHours =
    teacherSupplies.reduce((sum, teacher) => sum + teacher.availableHours, 0) + input.newTeacherCount * 6;
  const travelFactor = input.travelLimitMinutes >= 30 ? 1 : input.travelLimitMinutes / 30;
  const schoolFactor = input.maxSchoolsPerTeacher >= 2 ? 1 : 0.82;
  const usableSupply = availableHours * travelFactor * schoolFactor;
  const unresolvedShortageHours = Math.max(0, adjustedDemand - usableSupply);
  const expectedCircuitTeachers = Math.max(1, Math.ceil((adjustedDemand - unresolvedShortageHours) / 7));
  const averageTravelMinutes = round(Math.max(12, 32 - input.travelLimitMinutes * 0.22 + input.maxSchoolsPerTeacher * 1.8));
  const averageBurdenScore = round(clamp(54 + expectedCircuitTeachers * 2.4 - input.newTeacherCount * 3 + unresolvedShortageHours * 0.6));

  const baseline = {
    expectedCircuitTeachers: 7,
    unresolvedShortageHours: 9,
    averageTravelMinutes: 26,
    averageBurdenScore: 68,
  };

  return {
    expectedCircuitTeachers,
    unresolvedShortageHours: round(unresolvedShortageHours),
    averageTravelMinutes,
    averageBurdenScore,
    teacherDelta: expectedCircuitTeachers - baseline.expectedCircuitTeachers,
    shortageDelta: round(unresolvedShortageHours - baseline.unresolvedShortageHours),
    travelDelta: round(averageTravelMinutes - baseline.averageTravelMinutes),
    burdenDelta: round(averageBurdenScore - baseline.averageBurdenScore),
  };
}

export function getDashboardStats() {
  const demandRiskRows = buildDemandRiskRows();
  const supplyPotentialRows = buildSupplyPotentialRows();
  const uniqueDemandSubjects = new Set(demandRecords.map((record) => record.subject));
  const readyPublicRecords = publicRecordCount();

  return [
    { label: "학교 기본정보 수", value: schools.length, status: "준비 완료", detail: "NEIS 학교기본정보 기준" },
    { label: "교과별 교사 수 데이터 수", value: readyPublicRecords, status: "검증 완료", detail: "학교알리미 교원 현황" },
    { label: "장학사 입력 수요 데이터 수", value: demandRecords.length, status: "반영 대기", detail: "업로드 검증 후 분석 가능" },
    { label: "순회 수요 과목 수", value: uniqueDemandSubjects.size, status: "위험도 산출", detail: `상위 위험 ${demandRiskRows[0]?.subject ?? "-"} 과목` },
    { label: "공급 가능 교사 수", value: teacherSupplies.length, status: "공급 후보", detail: `상위 적합 ${supplyPotentialRows[0]?.teacher ?? "-"} 교사` },
    { label: "AI 추천안 수", value: recommendations.length, status: "추천 생성", detail: "조건 변경 시 재정렬" },
  ];
}

function publicRecordCount(): number {
  return teacherSupplies.length * subjectsPerTeacherFactor();
}

function subjectsPerTeacherFactor(): number {
  return 6;
}
