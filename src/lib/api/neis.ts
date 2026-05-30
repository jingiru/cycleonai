import { getServerEnv } from "@/lib/env";

export const DAEJEON_OFFICE_CODE = "G10";
export const MIDDLE_SCHOOL_KIND_CODE = "03";

export type NeisSchoolInfoRow = {
  ATPT_OFCDC_SC_CODE?: string;
  ATPT_OFCDC_SC_NM?: string;
  SD_SCHUL_CODE?: string;
  SCHUL_NM?: string;
  ENG_SCHUL_NM?: string;
  SCHUL_KND_SC_NM?: string;
  LCTN_SC_NM?: string;
  JU_ORG_NM?: string;
  FOND_SC_NM?: string;
  ORG_RDNMA?: string;
  ORG_RDNDA?: string;
  ORG_TELNO?: string;
  HMPG_ADRES?: string;
  COEDU_SC_NM?: string;
  DGHT_SC_NM?: string;
  FOND_YMD?: string;
  FOAS_MEMRD?: string;
  LOAD_DTM?: string;
  [key: string]: unknown;
};

export type NeisListResponse<T> = {
  rows: T[];
  totalCount: number;
  raw: unknown;
};

type NeisOptions = {
  endpoint: string;
  params?: Record<string, string | number | undefined>;
  pageIndex?: number;
  pageSize?: number;
};

function readNeisHead(body: any, endpoint: string): { totalCount: number; resultCode?: string; message?: string } {
  const blocks = body?.[endpoint];
  const head = Array.isArray(blocks) ? blocks.find((block) => block.head)?.head : undefined;
  const totalCount = Number(head?.find?.((item: any) => item?.list_total_count)?.list_total_count || 0);
  const result = head?.find?.((item: any) => item?.RESULT)?.RESULT;

  return {
    totalCount,
    resultCode: result?.CODE,
    message: result?.MESSAGE,
  };
}

function readNeisRows<T>(body: any, endpoint: string): T[] {
  const blocks = body?.[endpoint];
  const rowBlock = Array.isArray(blocks) ? blocks.find((block) => Array.isArray(block.row)) : undefined;
  return Array.isArray(rowBlock?.row) ? rowBlock.row : [];
}

export async function fetchNeisList<T>({
  endpoint,
  params = {},
  pageIndex = 1,
  pageSize = 100,
}: NeisOptions): Promise<NeisListResponse<T>> {
  const env = getServerEnv();
  const url = new URL(`${env.NEIS_BASE_URL}/${endpoint}`);

  url.searchParams.set("KEY", env.NEIS_API_KEY);
  url.searchParams.set("Type", "json");
  url.searchParams.set("pIndex", String(pageIndex));
  url.searchParams.set("pSize", String(pageSize));

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    console.error(`[NEIS] fetch failed: ${endpoint}`, error);
    throw error;
  }

  if (!response.ok) {
    console.error(`[NEIS] fetch failed: ${endpoint} ${response.status} ${response.statusText}`);
    throw new Error(`NEIS request failed: ${response.status}`);
  }

  const body = await response.json();

  if (!body) {
    console.error(`[NEIS] empty response: ${endpoint}`);
    throw new Error("NEIS empty response");
  }

  const head = readNeisHead(body, endpoint);
  const rows = readNeisRows<T>(body, endpoint);

  if (head.resultCode && head.resultCode !== "INFO-000") {
    console.error(`[NEIS] response error: ${head.resultCode} ${head.message || ""}`);
  }

  if (head.totalCount > 0 && rows.length === 0) {
    console.error(`[NEIS] no rows in response: ${endpoint}`);
  }

  return {
    rows,
    totalCount: head.totalCount,
    raw: body,
  };
}

export async function fetchAllNeisPages<T>(
  options: Omit<NeisOptions, "pageIndex">,
): Promise<NeisListResponse<T>> {
  const pageSize = options.pageSize || 100;
  const firstPage = await fetchNeisList<T>({ ...options, pageIndex: 1, pageSize });
  const rows = [...firstPage.rows];
  const totalPages = Math.ceil(firstPage.totalCount / pageSize);
  const rawPages = [firstPage.raw];

  for (let pageIndex = 2; pageIndex <= totalPages; pageIndex += 1) {
    const page = await fetchNeisList<T>({ ...options, pageIndex, pageSize });
    rows.push(...page.rows);
    rawPages.push(page.raw);
  }

  if (firstPage.totalCount === 0) {
    console.error(`[NEIS] data not found: ${options.endpoint}`);
  }

  return {
    rows,
    totalCount: firstPage.totalCount,
    raw: rawPages,
  };
}

export function fetchDaejeonMiddleSchools(pageSize = 100) {
  return fetchAllNeisPages<NeisSchoolInfoRow>({
    endpoint: "schoolInfo",
    pageSize,
    params: {
      ATPT_OFCDC_SC_CODE: DAEJEON_OFFICE_CODE,
      SCHUL_KND_SC_NM: "중학교",
    },
  });
}

