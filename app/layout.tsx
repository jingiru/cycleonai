import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "CycleOnAI School Data",
  description: "Daejeon middle school public education data pipeline",
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

