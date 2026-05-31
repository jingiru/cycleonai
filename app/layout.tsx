import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "순회ON AI",
  description: "공공데이터와 장학사 입력 데이터를 결합한 순회교사 AI 배치 의사결정 지원 서비스",
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
