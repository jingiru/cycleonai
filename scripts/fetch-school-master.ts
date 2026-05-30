import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { fetchDaejeonMiddleSchools } from "@/lib/api/neis";
import { fetchDaejeonMiddleSchoolInfo, SCHOOLINFO_API_TYPES } from "@/lib/api/schoolInfo";
import { normalizeSchoolMaster } from "@/lib/data/normalizeSchool";

const RAW_DIR = path.join(process.cwd(), "data", "raw");
const PROCESSED_DIR = path.join(process.cwd(), "data", "processed");

async function writeJson(filePath: string, data: unknown) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true });
  await mkdir(PROCESSED_DIR, { recursive: true });

  const [neisSchools, schoolInfoBasic] = await Promise.all([
    fetchDaejeonMiddleSchools(100),
    fetchDaejeonMiddleSchoolInfo(SCHOOLINFO_API_TYPES.schoolBasic),
  ]);

  await writeJson(path.join(RAW_DIR, "neis_schoolInfo_daejeon_middle.json"), neisSchools.raw);
  await writeJson(path.join(RAW_DIR, "schoolinfo_basic_daejeon_middle.json"), schoolInfoBasic.raw);

  const schoolMaster = normalizeSchoolMaster(neisSchools.rows, schoolInfoBasic.rows);

  if (schoolMaster.length === 0) {
    console.error("[pipeline] data not found: school_master is empty");
  }

  await writeJson(path.join(PROCESSED_DIR, "school_master.json"), schoolMaster);

  console.log(`[pipeline] wrote ${schoolMaster.length} schools to data/processed/school_master.json`);
}

main().catch((error) => {
  console.error("[pipeline] fetch-school-master failed", error);
  process.exit(1);
});

