const SUBJECT_ALIASES: Record<string, string> = {
  국어: "국어",
  수학: "수학",
  영어: "영어",
  사회: "사회",
  역사: "역사",
  도덕: "도덕",
  과학: "과학",
  기술: "기술·가정",
  가정: "기술·가정",
  기술가정: "기술·가정",
  기술·가정: "기술·가정",
  기술ㆍ가정: "기술·가정",
  정보: "정보",
  정보컴퓨터: "정보",
  정보·컴퓨터: "정보",
  정보ㆍ컴퓨터: "정보",
  컴퓨터: "정보",
  체육: "체육",
  음악: "음악",
  미술: "미술",
  한문: "한문",
  진로와직업: "진로와직업",
  진로와직업과: "진로와직업",
  진로: "진로와직업",
  예술: "예술",
  음악미술: "예술",
  예술음악미술: "예술",
};

function simplifySubjectName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "")
    .replace(/[()（）]/g, "")
    .replace(/[\/,]/g, "")
    .replace(/ㆍ/g, "·");
}

export function normalizeSubjectName(name: string): string {
  const simplified = simplifySubjectName(name);

  if (!simplified) {
    return "";
  }

  const alias = SUBJECT_ALIASES[simplified];

  if (alias) {
    return alias;
  }

  if (simplified.includes("정보") || simplified.includes("컴퓨터")) {
    return "정보";
  }

  if (simplified.includes("기술") || simplified.includes("가정")) {
    return "기술·가정";
  }

  if (simplified.includes("음악") && simplified.includes("미술")) {
    return "예술";
  }

  if (simplified.includes("음악")) {
    return "음악";
  }

  if (simplified.includes("미술")) {
    return "미술";
  }

  if (simplified.includes("진로") && simplified.includes("직업")) {
    return "진로와직업";
  }

  return name.trim();
}
