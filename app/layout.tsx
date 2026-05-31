import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "CycleON AI 학교 데이터 분석",
  description: "학교알리미와 NEIS 기반 과목별 교원수 및 시간표 시수 분석",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
