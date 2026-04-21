// app/layout.tsx
import React from "react";

export const metadata = {
  title: "LOOKA - 로케이션 하이엔드 프로토타입",
  description: "10년 차 PD의 전문 로케이션 관리 앱",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, padding: 0, fontFamily: 'sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
