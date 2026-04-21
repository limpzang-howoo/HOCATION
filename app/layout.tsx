import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// 하이엔드 느낌을 위해 Inter 폰트 사용 (또는 Pretendard 권장)
const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "LOOKA | Premium Location Scouting",
  description: "High-end location scouting platform for professional producers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body
        className={`${inter.className} bg-black text-white antialiased selection:bg-white/30 selection:text-white`}
      >
        {/* Vision OS Style Background: 깊이감을 위한 미세한 조명 효과 */}
        <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-black to-black"></div>
        
        {/* 메인 컨텐츠 */}
        <main className="relative min-h-screen w-full overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
