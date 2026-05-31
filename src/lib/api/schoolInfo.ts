import { getServerEnv } from "@/lib/env";

export const SCHOOLINFO_DAEJEON_SIDO_CODE = "30";
export const SCHOOLINFO_MIDDLE_SCHOOL_KIND_CODE = "03";

export const SCHOOLINFO_API_TYPES = {
  schoolBasic: "0",
  classDaysAndHours: "08",
  studentByGradeClass: "09",
  teacherBySubject: "24",
} as const;

export const DEFAULT_SCHOOLINFO_PBAN_YEAR = String(new Date().getFullYear());

export type SchoolInfoApiType =
  (typeof SCHOOLINFO_API_TYPES)[keyof typeof SCHOOLINFO_API_TYPES];

export type SchoolInfoRow = {
  SCHUL_NM?: string;
  SCHUL_CODE?: string;
  SCHUL_KND_CODE?: string;
  SCHUL_KND_SC_CODE?: string;
  SCHUL_KND_NM?: string;
  ADRES?: string;
  ADRES_BRKDN?: string;
  SCHUL_RDNMA?: string;
  DTLAD_BRKDN?: string;
  ADRCD_NM?: string;
  LTTUD?: string;
  LGTUD?: string;
  FOND_SC_NM?: string;
  SCHUL_FOND_TYP_CODE?: string;
  COEDU_SC_NM?: string;
  COEDU_SC_CODE?: string;
  JU_ORG_CODE?: string;
  USER_ORG_CODE?: string;
  [key: string]: unknown;
};

export type SchoolInfoResponse<T> = {
  rows: T[];
  raw: unknown;
};

export type SchoolInfoParams = {
  apiType: SchoolInfoApiType | string;
  sidoCode?: string;
  sggCode?: string;
  schulKndCode?: string;
  pbanYr?: string | number;
  params?: Record<string, string | number | undefined>;
};

function readSchoolInfoRows<T>(body: any): T[] {
  if (Array.isArray(body?.list)) {
    return body.list;
  }

  if (body?.list && typeof body.list === "object") {
    return [body.list];
  }

  return [];
}

export async function fetchSchoolInfo<T = SchoolInfoRow>({
  apiType,
  sidoCode = SCHOOLINFO_DAEJEON_SIDO_CODE,
  sggCode,
  schulKndCode = SCHOOLINFO_MIDDLE_SCHOOL_KIND_CODE,
  pbanYr,
  params = {},
}: SchoolInfoParams): Promise<SchoolInfoResponse<T>> {
  const env = getServerEnv();
  const url = new URL(env.SCHOOLINFO_BASE_URL);

  url.searchParams.set("apiKey", env.SCHOOLINFO_API_KEY);
  url.searchParams.set("apiType", apiType);
  url.searchParams.set("sidoCode", sidoCode);
  url.searchParams.set("schulKndCode", schulKndCode);

  if (sggCode) {
    url.searchParams.set("sggCode", sggCode);
  }

  if (pbanYr) {
    url.searchParams.set("pbanYr", String(pbanYr));
  }

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    console.error(`[SchoolInfo] fetch failed: apiType=${apiType}`, error);
    throw error;
  }

  if (!response.ok) {
    console.error(`[SchoolInfo] fetch failed: apiType=${apiType} ${response.status} ${response.statusText}`);
    throw new Error(`SchoolInfo request failed: ${response.status}`);
  }

  const body = await response.json();

  if (!body) {
    console.error(`[SchoolInfo] empty response: apiType=${apiType}`);
    throw new Error("SchoolInfo empty response");
  }

  if (body.resultCode && body.resultCode !== "success") {
    console.error(`[SchoolInfo] response error: ${body.resultCode} ${body.resultMsg || ""}`);
    throw new Error(`SchoolInfo response error: ${body.resultMsg || body.resultCode}`);
  }

  const rows = readSchoolInfoRows<T>(body);

  if (rows.length === 0) {
    console.error(`[SchoolInfo] data not found or list missing: apiType=${apiType}`);
  }

  return {
    rows,
    raw: body,
  };
}

export function fetchDaejeonMiddleSchoolInfo(apiType: SchoolInfoApiType | string, pbanYr?: string | number) {
  return fetchSchoolInfo({
    apiType,
    pbanYr,
    sidoCode: SCHOOLINFO_DAEJEON_SIDO_CODE,
    schulKndCode: SCHOOLINFO_MIDDLE_SCHOOL_KIND_CODE,
  });
}

export function fetchDaejeonMiddleSchoolDisclosure(
  apiType: SchoolInfoApiType | string,
  pbanYr: string | number = DEFAULT_SCHOOLINFO_PBAN_YEAR,
  params?: Record<string, string | number | undefined>,
) {
  return fetchSchoolInfo({
    apiType,
    pbanYr,
    params,
    sidoCode: SCHOOLINFO_DAEJEON_SIDO_CODE,
    schulKndCode: SCHOOLINFO_MIDDLE_SCHOOL_KIND_CODE,
  });
}
