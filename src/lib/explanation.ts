import type { AssignmentRecommendation } from "@/lib/mock-data";

export function generateRecommendationExplanation(recommendation: AssignmentRecommendation): string {
  const travelPhrase =
    recommendation.averageTravelMinutes <= 20
      ? "평균 이동시간이 20분 이하"
      : recommendation.averageTravelMinutes <= 30
        ? "평균 이동시간이 30분 이내"
        : "이동시간은 다소 길지만 배정 가능한 공급 시수가 충분";
  const loadPhrase =
    recommendation.totalHours <= 8
      ? "교사의 총 담당 시수가 낮아 순회 부담이 작습니다"
      : "교사의 총 담당 시수가 제한 범위 안에 있어 운영 가능합니다";

  return `이 추천안은 ${recommendation.assignedSchools.length}개 학교를 ${recommendation.subject} 교과 중심으로 묶어 배정합니다. ${travelPhrase}이며, ${loadPhrase}. 또한 ${recommendation.subject} 교과의 부족 시수 ${recommendation.resolvedShortageHours}시간을 우선적으로 해소합니다.`;
}

export function buildReportSummary(input: {
  riskySubjects: string[];
  topRecommendation: AssignmentRecommendation | undefined;
}) {
  return {
    sources:
      "학교알리미 교원 현황, NEIS 학교기본정보, 학교 위치 데이터, 장학사 업로드 수요·공급·이동시간 데이터를 결합해 분석합니다.",
    criteria:
      "필요 시수, 교내 확보 가능 시수, 이동시간, 생활권, 교사 가용 시수, 신규교사 제외 조건을 주요 판단 기준으로 사용했습니다.",
    risks: input.riskySubjects.join(", "),
    recommendation: input.topRecommendation
      ? `${input.topRecommendation.teacherName} 교사를 ${input.topRecommendation.assignedSchools.join(", ")}에 배정하는 안이 현재 조건에서 가장 높은 적합도를 보입니다.`
      : "현재 조건에서 표시 가능한 추천안이 없습니다.",
    impact:
      "고위험 과목의 미해결 부족 시수를 줄이고, 동일 생활권 우선 배정을 통해 장거리 순회 부담을 낮추는 효과가 기대됩니다.",
    limitation:
      "현재 결과는 mock 데이터 기반 의사결정 지원 예시입니다. 실제 배치 전 학교 제출 엑셀, 최신 NEIS·학교알리미 데이터, 교육청 내부 검토 기준을 연결해야 합니다.",
  };
}
