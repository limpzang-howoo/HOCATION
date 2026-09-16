"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function LocationPage() {
  const params = useParams();
  const id = params.id as string;
  const category = params.category as string;
  const location = params.location as string;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center">
      <div className="pointer-events-none fixed left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[#deff9a]/[0.04] blur-[140px]" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10">
        <p className="mb-3 font-mono text-xs tracking-widest text-white/30">
          <Link href={`/production/${id}/${category}`} className="hover:text-[#deff9a] transition-colors">
            ← BACK
          </Link>
        </p>
        <h1 className="text-xl font-light tracking-widest text-white">{location.toUpperCase()}</h1>
        <p className="mt-4 max-w-md text-sm font-light text-white/30">
          VR 파노라마 뷰어, 5열 갤러리, 스파이셜 라이트박스가 다음 단계에서 여기 들어갈 예정입니다.
        </p>
      </motion.div>
    </div>
  );
}
