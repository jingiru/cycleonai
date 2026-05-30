import "dotenv/config";

import { fetchDaejeonMiddleSchoolInfo, SCHOOLINFO_API_TYPES } from "@/lib/api/schoolInfo";

async function main() {
  const result = await fetchDaejeonMiddleSchoolInfo(SCHOOLINFO_API_TYPES.schoolBasic);
  console.log(`[SchoolInfo] rows=${result.rows.length}`);
  console.log(result.rows.slice(0, 3));
}

main().catch((error) => {
  console.error("[SchoolInfo] test failed", error);
  process.exit(1);
});

