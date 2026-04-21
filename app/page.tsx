"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Film, Briefcase, Lock, ArrowRight, X } from "lucide-react";

// --- 부품 1: 섹션 카드 디자인 ---
function SelectionCard({ title, icon, onClick, delay }: { title: string; icon: React.ReactNode; onClick: () => void; delay: number }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="group relative flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-10 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.04]"
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="text-white/60 transition-colors duration-300 group-hover:text-white/90">{icon}</div>
      <span className="text-lg font-light tracking-wide text-white/70 transition-colors duration-300 group-hover:text-white">{title}</span>
    </motion.button>
  );
}

// --- 메인 화면 ---
export default function Home() {
  const router = useRouter();
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [isError, setIsError] = useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "1234") {
      router.push("/projects"); // 성공 시 이동할 곳
    } else {
      setIsError(true);
      setTimeout(() => setIsError(false), 500);
      setPassword("");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mb-16 text-center">
        <h1 className="text-5xl font-light tracking-[0.2em] text-white/90 sm:text-6xl">LOOKA</h1>
        <p className="mt-4 text-sm font-light tracking-widest text-white/40">PREMIUM LOCATION ARCHIVE</p>
      </motion.div>

      <div className="flex w-full max-w-2xl flex-col gap-6 sm:flex-row">
        <SelectionCard title="Production" icon={<Film className="h-8 w-8 stroke-[1.5]" />} onClick={() => setSelectedSection("Production")} delay={0.1} />
        <SelectionCard title="Agency" icon={<Briefcase className="h-8 w-8 stroke-[1.5]" />} onClick={() => setSelectedSection("Agency")} delay={0.2} />
      </div>

      <AnimatePresence>
        {selectedSection && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md" onClick={() => setSelectedSection(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 p-4">
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-2xl">
                <button onClick={() => setSelectedSection(null)} className="absolute right-4 top-4 text-white/40 hover:text-white"><X className="h-5 w-5" /></button>
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10"><Lock className="h-5 w-5" /></div>
                  <h2 className="text-xl font-medium text-white/90">{selectedSection} Access</h2>
                  <p className="mt-2 text-sm text-white/40">접근 코드를 입력해주세요</p>
                </div>
                <form onSubmit={handlePasswordSubmit}>
                  <motion.div animate={isError ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }}>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/20 py-4 text-center text-2xl tracking-[0.5em] outline-none" placeholder="••••" maxLength={4} autoFocus />
                  </motion.div>
                  <button type="submit" className="group mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 py-4 text-white hover:bg-white/20">Enter Archive <ArrowRight className="h-4 w-4" /></button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
