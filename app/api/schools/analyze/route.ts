import { NextResponse } from "next/server";
import { z } from "zod";

import { buildSchoolAnalysis } from "@/lib/school-analysis";

const AnalysisRequestSchema = z.object({
  school: z.object({
    schoolName: z.string().min(1),
    neisSchoolCode: z.string().min(1),
    schoolInfoCode: z.string().min(1),
    officeCode: z.string().min(1),
    level: z.string().min(1),
    address: z.string(),
    foundationType: z.string().optional(),
    coedType: z.string().optional(),
  }),
  years: z.array(z.number().int().min(2000).max(2100)).min(1).max(6),
});

export async function POST(request: Request) {
  const parsed = AnalysisRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "학교 정보와 분석 연도를 확인해 주세요.",
      },
      { status: 400 },
    );
  }

  const analysis = await buildSchoolAnalysis(parsed.data.school, parsed.data.years);
  return NextResponse.json(analysis);
}
