"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import PasswordGate from "./components/PasswordGate";

// TODO: 실제 클라이언트/프로덕션 로고 데이터로 교체 예정 (지금은 100개 플레이스홀더)
const BRANDS = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  name: `BRAND ${String(i + 1).padStart(2, "0")}`,
}));

export default function Home() {
  return (
    <PasswordGate
      storageKey="looka_master_auth"
      correctPassword="1234"
      title="LOCATION ARCHIVE"
      subtitle="MASTER ACCESS"
    >
      <HomeGrid />
    </PasswordGate>
  );
}

function HomeGrid() {
  return (
    <div className="relative min-h-screen bg-black px-4 py-10 sm:px-8 sm:py-16">
      {/* 배경 은은한 네온 글로우 */}
      <div className="pointer-events-none fixed left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[#deff9a]/[0.04] blur-[140px]" />

      {/* 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mb-12 text-center sm:mb-16"
      >
        <h1 className="text-3xl font-light tracking-[0.35em] text-white sm:text-4xl">
          LOCATION <span className="text-[#deff9a]">ARCHIVE</span>
        </h1>
        <div className="mt-4 flex items-center justify-center gap-3">
          <div className="h-px w-8 bg-white/20" />
          <p className="text-[10px] font-light uppercase tracking-[0.5em] text-white/30">
            Premium Archive
          </p>
          <div className="h-px w-8 bg-white/20" />
        </div>
      </motion.div>

      {/* 10 x 10 그리드 */}
      <div className="relative z-10 mx-auto grid max-w-[1400px] grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3 md:grid-cols-10">
        {BRANDS.map((brand, idx) => (
          <motion.div
            key={brand.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.4,
              delay: Math.min(idx, 40) * 0.012,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <Link
              href={`/production/${brand.id}`}
              className="group flex aspect-square items-center justify-center rounded-md border border-white/10 bg-[#0A0A0A] p-2 text-center transition-all duration-300 hover:border-[#deff9a]/50 hover:bg-[#deff9a]/[0.06]"
            >
              <span className="text-[9px] font-light tracking-widest text-white/30 transition-colors duration-300 group-hover:text-[#deff9a] sm:text-[10px]">
                {brand.name}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>

      <footer className="relative z-10 mt-16 text-center text-[10px] tracking-widest text-white/10">
        © 2026 LOCATION ARCHIVE. ALL RIGHTS RESERVED.
        <br />
        <Link href="/admin" className="mt-2 inline-block text-white/15 hover:text-[#deff9a]/60 transition-colors">
          ADMIN
        </Link>
      </footer>
    </div>
  );
}
