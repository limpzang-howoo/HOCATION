"use client";

import { motion } from "framer-motion";

export default function ProjectsPage() {
  return (
    <div className="p-8">
      <motion.h1 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="text-3xl font-light tracking-widest text-white/90"
      >
        PROJECT ARCHIVE
      </motion.h1>
      <p className="mt-4 text-white/40 text-sm">로케이션 폴더들이 곧 여기에 표시됩니다...</p>
      
      {/* 나중에 여기에 진짜 폴더 목록이 들어올 거야! */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
