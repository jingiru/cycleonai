import { NextResponse } from "next/server";

import { searchLocalSchools } from "@/lib/school-search";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";

  return NextResponse.json({
    query,
    schools: searchLocalSchools(query),
  });
}
