export type School = {
  id: string;
  name: string;
  district: string;
  area: string;
  students: number;
  teachers: number;
  latitude: number;
  longitude: number;
};

export type PublicDataset = {
  id: string;
  name: string;
  source: string;
  status: "ready" | "partial" | "scheduled";
  records: number;
  lastUpdated: string;
  description: string;
};

export type DemandRecord = {
  id: string;
  schoolName: string;
  subject: string;
  requiredHours: number;
  reason: string;
  priority: "높음" | "보통" | "낮음";
};

export type TeacherSupply = {
  teacherId: string;
  teacherName: string;
  baseSchool: string;
  subject: string;
  availableHours: number;
  preferredArea: string;
  canTravel: boolean;
  isNewTeacher: boolean;
  currentHours: number;
};

export type TravelTime = {
  fromSchool: string;
  toSchool: string;
  travelMinutes: number;
  distanceKm: number;
};

export type AssignmentRecommendation = {
  id: string;
  teacherId: string;
  teacherName: string;
  baseSchool: string;
  subject: string;
  assignedSchools: string[];
  totalHours: number;
  averageTravelMinutes: number;
  fitScore: number;
  resolvedShortageHours: number;
};

export const subjects = ["정보", "과학", "기술·가정", "음악", "미술", "한문"];

export const schools: School[] = [
  { id: "S001", name: "대전가온중학교", district: "서구", area: "둔산권", students: 618, teachers: 42, latitude: 36.351, longitude: 127.378 },
  { id: "S002", name: "대전누리중학교", district: "유성구", area: "유성권", students: 554, teachers: 38, latitude: 36.362, longitude: 127.344 },
  { id: "S003", name: "대전새빛중학교", district: "중구", area: "원도심권", students: 371, teachers: 31, latitude: 36.325, longitude: 127.421 },
  { id: "S004", name: "대전한밭중학교", district: "동구", area: "동부권", students: 412, teachers: 34, latitude: 36.333, longitude: 127.455 },
  { id: "S005", name: "대전미래중학교", district: "대덕구", area: "대덕권", students: 486, teachers: 36, latitude: 36.388, longitude: 127.425 },
  { id: "S006", name: "대전솔빛중학교", district: "서구", area: "도안권", students: 703, teachers: 45, latitude: 36.335, longitude: 127.347 },
  { id: "S007", name: "대전푸른중학교", district: "유성구", area: "노은권", students: 589, teachers: 40, latitude: 36.375, longitude: 127.319 },
  { id: "S008", name: "대전해솔중학교", district: "중구", area: "원도심권", students: 328, teachers: 29, latitude: 36.309, longitude: 127.405 },
];

export const publicDatasets: PublicDataset[] = [
  {
    id: "schoolinfo",
    name: "학교알리미 데이터",
    source: "학교알리미 공개 데이터",
    status: "ready",
    records: 48,
    lastUpdated: "2026-05-31",
    description: "학교 규모, 학생 수, 교원 현황을 수요 추정 기준으로 활용",
  },
  {
    id: "neis",
    name: "NEIS 학교기본정보 데이터",
    source: "NEIS OpenAPI",
    status: "ready",
    records: schools.length,
    lastUpdated: "2026-05-31",
    description: "학교명, 학교급, 주소, 교육지원청 기준 정보",
  },
  {
    id: "location",
    name: "학교 위치 데이터",
    source: "학교 주소 기반 좌표 데이터",
    status: "partial",
    records: schools.length,
    lastUpdated: "2026-05-30",
    description: "생활권 판정과 학교 간 이동시간 산정에 활용",
  },
  {
    id: "teacherSubject",
    name: "교과별 교사 수 데이터",
    source: "학교알리미 교원 현황",
    status: "ready",
    records: 64,
    lastUpdated: "2026-05-31",
    description: "교내 확보 가능 시수와 순회 공급 가능성 추정",
  },
];

export const demandRecords: DemandRecord[] = [
  { id: "D001", schoolName: "대전가온중학교", subject: "정보", requiredHours: 6, reason: "선택 과목 확대와 전담 교사 부족", priority: "높음" },
  { id: "D002", schoolName: "대전누리중학교", subject: "한문", requiredHours: 4, reason: "소규모 과목 단독 편성 어려움", priority: "보통" },
  { id: "D003", schoolName: "대전새빛중학교", subject: "음악", requiredHours: 5, reason: "휴직 대체와 예술 교과 시수 증가", priority: "높음" },
  { id: "D004", schoolName: "대전한밭중학교", subject: "기술·가정", requiredHours: 4, reason: "교내 담당 시수 초과", priority: "높음" },
  { id: "D005", schoolName: "대전미래중학교", subject: "미술", requiredHours: 3, reason: "학급 증설에 따른 예술 교과 부족", priority: "보통" },
  { id: "D006", schoolName: "대전솔빛중학교", subject: "과학", requiredHours: 5, reason: "실험 수업 분반 운영", priority: "보통" },
  { id: "D007", schoolName: "대전푸른중학교", subject: "정보", requiredHours: 4, reason: "디지털 교육과정 확대", priority: "높음" },
  { id: "D008", schoolName: "대전해솔중학교", subject: "한문", requiredHours: 3, reason: "과목 선택 인원 감소로 겸임 필요", priority: "낮음" },
  { id: "D009", schoolName: "대전새빛중학교", subject: "과학", requiredHours: 4, reason: "담당 교사 장기 연수", priority: "높음" },
  { id: "D010", schoolName: "대전한밭중학교", subject: "음악", requiredHours: 3, reason: "자유학기 예술 활동 확대", priority: "보통" },
  { id: "D011", schoolName: "대전미래중학교", subject: "정보", requiredHours: 5, reason: "정보 교과 필수 편성 확대", priority: "높음" },
  { id: "D012", schoolName: "대전솔빛중학교", subject: "기술·가정", requiredHours: 4, reason: "담당 교사 전보 예정", priority: "보통" },
  { id: "D013", schoolName: "대전푸른중학교", subject: "미술", requiredHours: 3, reason: "예술 동아리 연계 수업 증가", priority: "낮음" },
];

export const teacherSupplies: TeacherSupply[] = [
  { teacherId: "T001", teacherName: "김도윤", baseSchool: "대전누리중학교", subject: "정보", availableHours: 8, preferredArea: "유성권", canTravel: true, isNewTeacher: false, currentHours: 12 },
  { teacherId: "T002", teacherName: "박서연", baseSchool: "대전가온중학교", subject: "과학", availableHours: 6, preferredArea: "둔산권", canTravel: true, isNewTeacher: false, currentHours: 14 },
  { teacherId: "T003", teacherName: "이준호", baseSchool: "대전미래중학교", subject: "기술·가정", availableHours: 7, preferredArea: "대덕권", canTravel: true, isNewTeacher: false, currentHours: 13 },
  { teacherId: "T004", teacherName: "최하은", baseSchool: "대전솔빛중학교", subject: "음악", availableHours: 6, preferredArea: "도안권", canTravel: true, isNewTeacher: false, currentHours: 12 },
  { teacherId: "T005", teacherName: "정민재", baseSchool: "대전해솔중학교", subject: "미술", availableHours: 5, preferredArea: "원도심권", canTravel: true, isNewTeacher: true, currentHours: 15 },
  { teacherId: "T006", teacherName: "한지우", baseSchool: "대전한밭중학교", subject: "한문", availableHours: 7, preferredArea: "동부권", canTravel: true, isNewTeacher: false, currentHours: 11 },
  { teacherId: "T007", teacherName: "오세진", baseSchool: "대전푸른중학교", subject: "정보", availableHours: 6, preferredArea: "노은권", canTravel: true, isNewTeacher: false, currentHours: 14 },
  { teacherId: "T008", teacherName: "문채원", baseSchool: "대전새빛중학교", subject: "과학", availableHours: 5, preferredArea: "원도심권", canTravel: false, isNewTeacher: false, currentHours: 15 },
  { teacherId: "T009", teacherName: "강유찬", baseSchool: "대전가온중학교", subject: "음악", availableHours: 4, preferredArea: "둔산권", canTravel: true, isNewTeacher: false, currentHours: 16 },
];

export const travelTimes: TravelTime[] = [
  { fromSchool: "대전누리중학교", toSchool: "대전푸른중학교", travelMinutes: 14, distanceKm: 4.2 },
  { fromSchool: "대전누리중학교", toSchool: "대전가온중학교", travelMinutes: 21, distanceKm: 7.4 },
  { fromSchool: "대전가온중학교", toSchool: "대전솔빛중학교", travelMinutes: 17, distanceKm: 5.8 },
  { fromSchool: "대전가온중학교", toSchool: "대전새빛중학교", travelMinutes: 24, distanceKm: 8.1 },
  { fromSchool: "대전미래중학교", toSchool: "대전한밭중학교", travelMinutes: 22, distanceKm: 8.6 },
  { fromSchool: "대전미래중학교", toSchool: "대전솔빛중학교", travelMinutes: 29, distanceKm: 11.2 },
  { fromSchool: "대전솔빛중학교", toSchool: "대전새빛중학교", travelMinutes: 27, distanceKm: 10.5 },
  { fromSchool: "대전솔빛중학교", toSchool: "대전한밭중학교", travelMinutes: 33, distanceKm: 13.8 },
  { fromSchool: "대전해솔중학교", toSchool: "대전미래중학교", travelMinutes: 26, distanceKm: 9.7 },
  { fromSchool: "대전해솔중학교", toSchool: "대전푸른중학교", travelMinutes: 35, distanceKm: 15.3 },
  { fromSchool: "대전한밭중학교", toSchool: "대전누리중학교", travelMinutes: 31, distanceKm: 13.2 },
  { fromSchool: "대전푸른중학교", toSchool: "대전미래중학교", travelMinutes: 28, distanceKm: 10.9 },
];

export const recommendations: AssignmentRecommendation[] = [
  { id: "R001", teacherId: "T001", teacherName: "김도윤", baseSchool: "대전누리중학교", subject: "정보", assignedSchools: ["대전푸른중학교", "대전가온중학교"], totalHours: 8, averageTravelMinutes: 18, fitScore: 92, resolvedShortageHours: 8 },
  { id: "R002", teacherId: "T006", teacherName: "한지우", baseSchool: "대전한밭중학교", subject: "한문", assignedSchools: ["대전누리중학교", "대전해솔중학교"], totalHours: 7, averageTravelMinutes: 24, fitScore: 86, resolvedShortageHours: 7 },
  { id: "R003", teacherId: "T003", teacherName: "이준호", baseSchool: "대전미래중학교", subject: "기술·가정", assignedSchools: ["대전한밭중학교", "대전솔빛중학교"], totalHours: 7, averageTravelMinutes: 26, fitScore: 84, resolvedShortageHours: 7 },
  { id: "R004", teacherId: "T004", teacherName: "최하은", baseSchool: "대전솔빛중학교", subject: "음악", assignedSchools: ["대전새빛중학교", "대전한밭중학교"], totalHours: 6, averageTravelMinutes: 30, fitScore: 78, resolvedShortageHours: 6 },
  { id: "R005", teacherId: "T002", teacherName: "박서연", baseSchool: "대전가온중학교", subject: "과학", assignedSchools: ["대전솔빛중학교", "대전새빛중학교"], totalHours: 6, averageTravelMinutes: 22, fitScore: 82, resolvedShortageHours: 6 },
  { id: "R006", teacherId: "T005", teacherName: "정민재", baseSchool: "대전해솔중학교", subject: "미술", assignedSchools: ["대전미래중학교", "대전푸른중학교"], totalHours: 5, averageTravelMinutes: 31, fitScore: 71, resolvedShortageHours: 5 },
];
