"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Film, Briefcase, Lock, ArrowRight, X, ChevronRight } from "lucide-react";

// --- 부품 1: 하이엔드 섹션 카드 ---
function SelectionCard({ title, icon, description, onClick, delay }: any) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="group relative flex flex-1 flex-col items-start justify-end gap-4 overflow-hidden rounded-[2rem] border border-white/5 bg-[#0A0A0A] p-10 transition-all hover:border-white/20"
    >
      {/* 호버 시 은은한 불빛 효과 */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-zinc-800/20 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/40 transition-all duration-500 group-hover:bg-white/10 group-hover:text-white">
        {icon}
      </div>
      
      <div className="text-left">
        <h3 className="text-2xl font-light tracking-tight text-white/90">{title}</h3>
        <p className="mt-2 text-sm font-light text-white/30">{description}</p>
      </div>

      <div className="mt-6 flex items-center gap-2 text-xs font-light tracking-[0.2em] text-white/20 transition-all group-hover:text-white/60">
        ENTER ARCHIVE <ChevronRight size={14} />
      </div>
    </motion.button>
  );
}

// --- 메인 화면 ---
export default function Home() {
  const router = useRouter();
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [password, setPassword] = useState("");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-black px-6 selection:bg-white/30">
      {/* 배경 빛 번짐 효과 (Vision OS 스타일) */}
      <div className="fixed left-1/2 top-0 -translate-x-1/2 w-[1000px] h-[600px] bg-zinc-900/30 blur-[120px] rounded-full pointer-events-none" />

      {/* 로고 영역 */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 1 }}
        className="z-10 mb-20 text-center"
      >
        <h1 className="text-6xl font-extralight tracking-[0.3em] text-white/90 sm:text-7xl">
          LOOKA
        </h1>
        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="h-[1px] w-8 bg-white/20" />
          <p className="text-[10px] font-light tracking-[0.5em] text-white/30 uppercase">Professional Scouting</p>
          <div className="h-[1px] w-8 bg-white/20" />
        </div>
      </motion.div>

      {/* 카드 섹션 */}
      <div className="z-10 flex w-full max-w-4xl flex-col gap-6 sm:flex-row">
        <SelectionCard 
          title="Production" 
          description="영화, 광고 제작사를 위한 로케이션 아카이브"
          icon={<Film size={28} strokeWidth={1} />} 
          onClick={() => setSelectedSection("Production")} 
          delay={0.2} 
        />
        <SelectionCard 
          title="Agency" 
          description="기획사 및 대행사 전용 데이터베이스"
          icon={<Briefcase size={28} strokeWidth={1} />} 
          onClick={() => setSelectedSection("Agency")} 
          delay={0.3} 
        />
      </div>

      {/* 비밀번호 모달 */}
      <AnimatePresence>
        {selectedSection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/80 backdrop-blur-xl" 
              onClick={() => setSelectedSection(null)} 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-12 shadow-2xl backdrop-blur-3xl"
            >
              <button onClick={() => setSelectedSection(null)} className="absolute right-8 top-8 text-white/20 hover:text-white transition-colors"><X size={20} /></button>
              
              <div className="mb-10 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                  <Lock size={24} className="text-white/60" />
                </div>
                <h2 className="text-2xl font-light text-white">{selectedSection} Access</h2>
                <p className="mt-3 text-sm text-white/30 font-light">보안 코드를 입력하여 데이터에 접속하세요</p>
              </div>

              <input 
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} 
                className="w-full rounded-2xl border border-white/5 bg-white/5 py-5 text-center text-3xl tracking-[0.6em] text-white outline-none focus:border-white/20 focus:bg-white/10 transition-all" 
                placeholder="••••" maxLength={4} autoFocus 
              />
              
              <button 
                onClick={() => password === "1234" ? router.push("/projects") : alert("Access Denied")} 
                className="mt-8 flex w-full items-center justify-center gap-3 rounded-[1.2rem] bg-white text-black py-5 text-sm font-medium transition-transform active:scale-[0.98] hover:bg-zinc-200"
              >
                Access Archive <ArrowRight size={18} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <footer className="fixed bottom-8 text-[10px] tracking-widest text-white/10">
        © 2026 LOOKA SYSTEM. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
}
