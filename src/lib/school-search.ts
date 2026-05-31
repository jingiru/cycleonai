import schoolMaster from "../../data/processed/school_master.json";

export type SchoolCandidate = {
  schoolName: string;
  neisSchoolCode: string;
  schoolInfoCode: string;
  officeCode: string;
  level: string;
  address: string;
  foundationType?: string;
  coedType?: string;
};

type SchoolMasterRow = {
  schoolName?: string;
  neisSchoolCode?: string;
  schoolInfoCode?: string;
  level?: string;
  address?: string;
  foundationType?: string;
  coedType?: string;
};

const DAEJEON_OFFICE_CODE = "G10";

function normalizeQuery(value: string) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

function toCandidate(row: SchoolMasterRow): SchoolCandidate | null {
  if (!row.schoolName || !row.neisSchoolCode || !row.schoolInfoCode) {
    return null;
  }

  return {
    schoolName: row.schoolName,
    neisSchoolCode: row.neisSchoolCode,
    schoolInfoCode: row.schoolInfoCode,
    officeCode: DAEJEON_OFFICE_CODE,
    level: row.level || "중학교",
    address: row.address || "",
    foundationType: row.foundationType,
    coedType: row.coedType,
  };
}

export function searchLocalSchools(query: string, limit = 12): SchoolCandidate[] {
  const normalized = normalizeQuery(query);

  if (normalized.length < 2) {
    return [];
  }

  return (schoolMaster as SchoolMasterRow[])
    .map(toCandidate)
    .filter((school): school is SchoolCandidate => Boolean(school))
    .filter((school) => normalizeQuery(school.schoolName).includes(normalized))
    .sort((a, b) => a.schoolName.localeCompare(b.schoolName, "ko"))
    .slice(0, limit);
}
