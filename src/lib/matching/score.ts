export type CircuitRequest = {
  requestId: string;
  requestSchool: string;
  subject: string;
  grade: number;
  requestedHours: number;
  reason: string;
};

export type TeacherCapacity = {
  teacherId: string;
  homeSchool: string;
  subject: string;
  currentWeeklyHours: number;
  availableWeeklyHours: number;
  grades: number[];
  isHomeroomTeacher: boolean;
};

export type PreviousAssignment = {
  teacherId: string;
  previousSchool: string;
  subject: string;
  grade: number;
  hours: number;
};

export type SchoolLocation = {
  schoolName: string;
  latitude: number | null;
  longitude: number | null;
};

export type MatchingScore = {
  total: number;
  distanceScore: number;
  gradeScore: number;
  continuityScore: number;
  capacityScore: number;
  homeroomBurdenScore: number;
  distanceKm: number | null;
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function calculateDistanceKm(from?: SchoolLocation, to?: SchoolLocation): number | null {
  if (
    !from?.latitude ||
    !from.longitude ||
    !to?.latitude ||
    !to.longitude
  ) {
    return null;
  }

  const earthRadiusKm = 6371;
  const latDelta = toRadians(to.latitude - from.latitude);
  const lonDelta = toRadians(to.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2);

  return round(earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function scoreDistance(distanceKm: number | null): number {
  if (distanceKm === null) {
    return 60;
  }

  if (distanceKm <= 3) return 100;
  if (distanceKm <= 6) return 90;
  if (distanceKm <= 10) return 75;
  if (distanceKm <= 15) return 55;
  if (distanceKm <= 25) return 35;
  return 15;
}

export function scoreGradeMatch(request: CircuitRequest, teacher: TeacherCapacity): number {
  if (teacher.grades.includes(request.grade)) {
    return 100;
  }

  return teacher.grades.some((grade) => Math.abs(grade - request.grade) === 1) ? 70 : 35;
}

export function scoreContinuity(
  request: CircuitRequest,
  teacher: TeacherCapacity,
  previousAssignments: PreviousAssignment[],
): number {
  const previous = previousAssignments.filter((assignment) => assignment.teacherId === teacher.teacherId);

  if (
    previous.some(
      (assignment) =>
        assignment.previousSchool === request.requestSchool &&
        assignment.subject === request.subject &&
        assignment.grade === request.grade,
    )
  ) {
    return 100;
  }

  if (
    previous.some(
      (assignment) =>
        assignment.previousSchool === request.requestSchool && assignment.subject === request.subject,
    )
  ) {
    return 85;
  }

  if (previous.some((assignment) => assignment.subject === request.subject && assignment.grade === request.grade)) {
    return 70;
  }

  if (previous.length > 0) {
    return 50;
  }

  return 40;
}

export function scoreCapacity(request: CircuitRequest, teacher: TeacherCapacity): number {
  if (teacher.availableWeeklyHours <= 0) {
    return 0;
  }

  const ratio = teacher.availableWeeklyHours / request.requestedHours;
  return clamp(ratio * 100);
}

export function scoreHomeroomBurden(teacher: TeacherCapacity): number {
  return teacher.isHomeroomTeacher ? 65 : 100;
}

export function scoreMatch(input: {
  request: CircuitRequest;
  teacher: TeacherCapacity;
  previousAssignments: PreviousAssignment[];
  requestSchool?: SchoolLocation;
  teacherSchool?: SchoolLocation;
}): MatchingScore {
  const distanceKm = calculateDistanceKm(input.teacherSchool, input.requestSchool);
  const distanceScore = scoreDistance(distanceKm);
  const gradeScore = scoreGradeMatch(input.request, input.teacher);
  const continuityScore = scoreContinuity(input.request, input.teacher, input.previousAssignments);
  const capacityScore = scoreCapacity(input.request, input.teacher);
  const homeroomBurdenScore = scoreHomeroomBurden(input.teacher);

  const total =
    distanceScore * 0.25 +
    gradeScore * 0.2 +
    continuityScore * 0.2 +
    capacityScore * 0.25 +
    homeroomBurdenScore * 0.1;

  return {
    total: round(total),
    distanceScore,
    gradeScore,
    continuityScore,
    capacityScore: round(capacityScore),
    homeroomBurdenScore,
    distanceKm,
  };
}

