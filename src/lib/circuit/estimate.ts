import { normalizeSubjectName } from "@/lib/subjects/subjectMap";

export type SubjectHourRecord = {
  schoolCode: string;
  schoolName: string;
  year: number;
  grade: number;
  subject: string;
  subjectGroup: string;
  weeklyHours: number;
};

export type TeacherSubjectCountRecord = {
  schoolCode: string;
  schoolName: string;
  year: number;
  subject: string;
  subjectGroup: string;
  teacherCount: number;
};

export type CircuitDemandEstimate = {
  schoolCode: string;
  schoolName: string;
  subjectGroup: string;
  subjectWeeklyHours: number;
  teacherCount: number;
  schoolAverageHoursPerTeacher: number | null;
  subjectHoursPerTeacher: number | null;
  demandRiskScore: number;
  reason: string;
};

export type CircuitSupplyEstimate = {
  schoolCode: string;
  schoolName: string;
  subjectGroup: string;
  subjectWeeklyHours: number;
  teacherCount: number;
  schoolAverageHoursPerTeacher: number | null;
  subjectHoursPerTeacher: number | null;
  supplyPotentialScore: number;
  reason: string;
};

type SchoolSubjectMetric = {
  schoolCode: string;
  schoolName: string;
  subjectGroup: string;
  subjectWeeklyHours: number;
  teacherCount: number;
  schoolAverageHoursPerTeacher: number | null;
  subjectHoursPerTeacher: number | null;
};

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function makeKey(schoolCode: string, subjectGroup: string): string {
  return `${schoolCode}::${subjectGroup}`;
}

function getSubjectGroup(subject: string, subjectGroup?: string): string {
  return normalizeSubjectName(subjectGroup || subject);
}

function buildMetrics(
  subjectHours: SubjectHourRecord[],
  teacherCounts: TeacherSubjectCountRecord[],
): SchoolSubjectMetric[] {
  const hoursByKey = new Map<string, SchoolSubjectMetric>();
  const schoolSubjectKeys = new Map<string, Set<string>>();

  for (const record of subjectHours) {
    const subjectGroup = getSubjectGroup(record.subject, record.subjectGroup);
    const key = makeKey(record.schoolCode, subjectGroup);
    const existing = hoursByKey.get(key);

    if (existing) {
      existing.subjectWeeklyHours += record.weeklyHours;
    } else {
      hoursByKey.set(key, {
        schoolCode: record.schoolCode,
        schoolName: record.schoolName,
        subjectGroup,
        subjectWeeklyHours: record.weeklyHours,
        teacherCount: 0,
        schoolAverageHoursPerTeacher: null,
        subjectHoursPerTeacher: null,
      });
    }

    const keys = schoolSubjectKeys.get(record.schoolCode) ?? new Set<string>();
    keys.add(key);
    schoolSubjectKeys.set(record.schoolCode, keys);
  }

  for (const record of teacherCounts) {
    const subjectGroup = getSubjectGroup(record.subject, record.subjectGroup);
    const key = makeKey(record.schoolCode, subjectGroup);
    const existing = hoursByKey.get(key);

    if (existing) {
      existing.teacherCount += record.teacherCount;
    } else {
      hoursByKey.set(key, {
        schoolCode: record.schoolCode,
        schoolName: record.schoolName,
        subjectGroup,
        subjectWeeklyHours: 0,
        teacherCount: record.teacherCount,
        schoolAverageHoursPerTeacher: null,
        subjectHoursPerTeacher: null,
      });
    }

    const keys = schoolSubjectKeys.get(record.schoolCode) ?? new Set<string>();
    keys.add(key);
    schoolSubjectKeys.set(record.schoolCode, keys);
  }

  const schoolAverageMap = new Map<string, number | null>();

  for (const [schoolCode, keys] of schoolSubjectKeys.entries()) {
    const perTeacherHours = [...keys]
      .map((key) => hoursByKey.get(key))
      .filter((metric): metric is SchoolSubjectMetric => Boolean(metric))
      .filter((metric) => metric.teacherCount > 0 && metric.subjectWeeklyHours > 0)
      .map((metric) => metric.subjectWeeklyHours / metric.teacherCount);

    const average =
      perTeacherHours.length > 0
        ? perTeacherHours.reduce((total, value) => total + value, 0) / perTeacherHours.length
        : null;

    schoolAverageMap.set(schoolCode, average === null ? null : round(average));
  }

  return [...hoursByKey.values()].map((metric) => {
    const subjectHoursPerTeacher =
      metric.teacherCount > 0 && metric.subjectWeeklyHours > 0
        ? round(metric.subjectWeeklyHours / metric.teacherCount)
        : null;

    return {
      ...metric,
      subjectWeeklyHours: round(metric.subjectWeeklyHours),
      schoolAverageHoursPerTeacher: schoolAverageMap.get(metric.schoolCode) ?? null,
      subjectHoursPerTeacher,
    };
  });
}

function compareRatio(value: number | null, average: number | null): number | null {
  if (value === null || average === null || average <= 0) {
    return null;
  }

  return value / average;
}

function buildDemandReason(metric: SchoolSubjectMetric, score: number): string {
  if (metric.subjectWeeklyHours > 0 && metric.teacherCount === 0) {
    return `시간표상 ${metric.subjectGroup} 수업이 확인되지만 표시과목별 교원 현황에서 ${metric.subjectGroup} 교원이 확인되지 않아 순회 지원을 받을 가능성이 높습니다.`;
  }

  const ratio = compareRatio(metric.subjectHoursPerTeacher, metric.schoolAverageHoursPerTeacher);

  if (ratio !== null && ratio >= 1.2) {
    return `${metric.subjectGroup} 교원 1인당 추정 시수가 학교 평균보다 20% 이상 높아 순회 지원 수요가 발생할 가능성이 있습니다.`;
  }

  if (ratio !== null && ratio >= 1.1) {
    return `${metric.subjectGroup} 교원 1인당 추정 시수가 학교 평균보다 높아 순회 지원 필요성을 검토할 수 있습니다.`;
  }

  if (score > 0) {
    return `시간표상 ${metric.subjectGroup} 수업이 확인되어 교원 현황과 함께 순회 수요 여부를 검토할 수 있습니다.`;
  }

  return `${metric.subjectGroup} 순회 수요를 판단할 근거가 부족합니다.`;
}

function buildSupplyReason(metric: SchoolSubjectMetric, score: number): string {
  const ratio = compareRatio(metric.subjectHoursPerTeacher, metric.schoolAverageHoursPerTeacher);

  if (ratio !== null && ratio <= 0.8) {
    return `${metric.subjectGroup} 교원이 있으나 과목별 추정 시수가 학교 평균보다 20% 이상 낮아 타교 순회 지원 가능성이 있습니다.`;
  }

  if (ratio !== null && ratio <= 0.9) {
    return `${metric.subjectGroup} 교원이 있으나 과목별 추정 시수가 학교 평균보다 낮아 타교 순회 지원 가능성이 있습니다.`;
  }

  if (metric.teacherCount > 0 && metric.subjectWeeklyHours <= 2) {
    return `${metric.subjectGroup} 교원이 있고 학교 내 추정 시수가 작아 일부 시수의 순회 지원 가능성을 검토할 수 있습니다.`;
  }

  if (score > 0) {
    return `${metric.subjectGroup} 교원이 확인되어 학교 간 시수 균형 조정 시 공급 후보로 검토할 수 있습니다.`;
  }

  return `${metric.subjectGroup} 순회 공급 가능성을 판단할 근거가 부족합니다.`;
}

export function estimateCircuitDemand(subjectHours: SubjectHourRecord[], teacherCounts: TeacherSubjectCountRecord[]) {
  return buildMetrics(subjectHours, teacherCounts)
    .filter((metric) => metric.subjectWeeklyHours > 0)
    .map<CircuitDemandEstimate>((metric) => {
      let score = 0;
      const ratio = compareRatio(metric.subjectHoursPerTeacher, metric.schoolAverageHoursPerTeacher);

      if (metric.subjectWeeklyHours > 0) score += 20;
      if (metric.teacherCount === 0 && metric.subjectWeeklyHours > 0) score += 40;
      if (ratio !== null && ratio >= 1.2) score += 25;
      else if (ratio !== null && ratio >= 1.1) score += 15;

      const demandRiskScore = clampScore(score);

      return {
        ...metric,
        demandRiskScore,
        reason: buildDemandReason(metric, demandRiskScore),
      };
    })
    .sort((a, b) => b.demandRiskScore - a.demandRiskScore || b.subjectWeeklyHours - a.subjectWeeklyHours);
}

export function estimateCircuitSupply(subjectHours: SubjectHourRecord[], teacherCounts: TeacherSubjectCountRecord[]) {
  return buildMetrics(subjectHours, teacherCounts)
    .filter((metric) => metric.teacherCount > 0)
    .map<CircuitSupplyEstimate>((metric) => {
      let score = 0;
      const ratio = compareRatio(metric.subjectHoursPerTeacher, metric.schoolAverageHoursPerTeacher);

      if (metric.teacherCount >= 1) score += 20;
      if (ratio !== null && ratio <= 0.8) score += 35;
      else if (ratio !== null && ratio <= 0.9) score += 20;
      if (metric.subjectWeeklyHours > 0 && metric.subjectWeeklyHours <= 2) score += 15;

      const supplyPotentialScore = clampScore(score);

      return {
        ...metric,
        supplyPotentialScore,
        reason: buildSupplyReason(metric, supplyPotentialScore),
      };
    })
    .sort((a, b) => b.supplyPotentialScore - a.supplyPotentialScore || a.subjectWeeklyHours - b.subjectWeeklyHours);
}
