import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  DEFAULT_SCHOOLINFO_PBAN_YEAR,
  fetchDaejeonMiddleSchoolDisclosure,
  SCHOOLINFO_API_TYPES,
} from "@/lib/api/schoolInfo";

const RAW_DIR = path.join(process.cwd(), "data", "raw");
const PROCESSED_DIR = path.join(process.cwd(), "data", "processed");

const TARGETS = [
  {
    name: "student_by_grade_class",
    apiType: SCHOOLINFO_API_TYPES.studentByGradeClass,
  },
  {
    name: "teacher_by_subject",
    apiType: SCHOOLINFO_API_TYPES.teacherBySubject,
    params: { depthNo: "20" },
  },
  {
    name: "class_days_and_hours",
    apiType: SCHOOLINFO_API_TYPES.classDaysAndHours,
  },
] as const;

async function writeJson(filePath: string, data: unknown) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true });
  await mkdir(PROCESSED_DIR, { recursive: true });

  const pbanYr = process.argv[2] || DEFAULT_SCHOOLINFO_PBAN_YEAR;
  const processed: Record<string, unknown[]> = {};

  for (const target of TARGETS) {
    const params = "params" in target ? target.params : undefined;
    const result = await fetchDaejeonMiddleSchoolDisclosure(target.apiType, pbanYr, params);
    await writeJson(path.join(RAW_DIR, `schoolinfo_${target.name}_${pbanYr}_daejeon_middle.json`), result.raw);
    processed[target.name] = result.rows;
    console.log(`[SchoolInfo] ${target.name}: pbanYr=${pbanYr}, rows=${result.rows.length}`);
  }

  const processedPath = path.join(PROCESSED_DIR, `schoolinfo_stats_${pbanYr}_daejeon_middle.json`);
  await writeJson(processedPath, processed);
  console.log(`[pipeline] wrote ${processedPath}`);
}

main().catch((error) => {
  console.error("[pipeline] fetch-schoolinfo-stats failed", error);
  process.exit(1);
});
