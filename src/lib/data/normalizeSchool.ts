import type { NeisSchoolInfoRow } from "@/lib/api/neis";
import type { SchoolInfoRow } from "@/lib/api/schoolInfo";

export type NormalizedSchool = {
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

function toNumberOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getSchoolInfoName(row: SchoolInfoRow): string {
  return clean(row.SCHUL_NM || row.SCHUL_NM_SW || row.SCHUL_NM_KRN);
}

export function normalizeSchoolMaster(
  neisRows: NeisSchoolInfoRow[],
  schoolInfoRows: SchoolInfoRow[],
): NormalizedSchool[] {
  const schoolInfoByName = new Map<string, SchoolInfoRow>();

  for (const row of schoolInfoRows) {
    const name = getSchoolInfoName(row);
    if (name) {
      schoolInfoByName.set(name, row);
    }
  }

  return neisRows
    .map((neisRow) => {
      const schoolName = clean(neisRow.SCHUL_NM);
      const schoolInfoRow = schoolInfoByName.get(schoolName);

      return {
        schoolName,
        neisSchoolCode: clean(neisRow.SD_SCHUL_CODE),
        schoolInfoCode: clean(
          schoolInfoRow?.SCHUL_CODE ||
            schoolInfoRow?.SCHUL_CODE_SW ||
            schoolInfoRow?.USER_ORG_CODE ||
            schoolInfoRow?.JU_ORG_CODE,
        ),
        level: clean(neisRow.SCHUL_KND_SC_NM || schoolInfoRow?.SCHUL_KND_NM || schoolInfoRow?.SCHUL_KND_SC_CODE),
        address: clean(
          neisRow.ORG_RDNMA ||
            neisRow.ORG_RDNDA ||
            schoolInfoRow?.SCHUL_RDNMA ||
            schoolInfoRow?.ADRES ||
            schoolInfoRow?.ADRES_BRKDN ||
            schoolInfoRow?.DTLAD_BRKDN,
        ),
        latitude: toNumberOrNull(schoolInfoRow?.LTTUD || schoolInfoRow?.LATITUDE),
        longitude: toNumberOrNull(schoolInfoRow?.LGTUD || schoolInfoRow?.LONGITUDE),
        foundationType: clean(neisRow.FOND_SC_NM || schoolInfoRow?.FOND_SC_NM || schoolInfoRow?.SCHUL_FOND_TYP_CODE),
        coedType: clean(neisRow.COEDU_SC_NM || schoolInfoRow?.COEDU_SC_NM || schoolInfoRow?.COEDU_SC_CODE),
      };
    })
    .filter((school) => school.schoolName && school.neisSchoolCode);
}
