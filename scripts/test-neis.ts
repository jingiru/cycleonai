import "dotenv/config";

import { fetchDaejeonMiddleSchools } from "@/lib/api/neis";

async function main() {
  const result = await fetchDaejeonMiddleSchools(10);
  console.log(`[NEIS] total=${result.totalCount}, firstPageRows=${result.rows.length}`);
  console.log(result.rows.slice(0, 3));
}

main().catch((error) => {
  console.error("[NEIS] test failed", error);
  process.exit(1);
});

