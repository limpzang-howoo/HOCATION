"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Film, Briefcase, Lock, ArrowRight, X } from "lucide-react";

// --- 부품: 섹션 카드 (에러 안 나게 여기다 합쳤어!) ---
function SelectionCard({ title, icon, onClick, delay }: any) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }} onClick={onClick}
      className="group relative flex flex-1 flex-col items-center justify-center gap-6 rounded-3xl border border-white/5 bg-white/[0.02] p-10 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.04]"
    >
      <div className="text-white/60 group-hover:text-white/90">{icon}</div>
      <span className="text-lg font-light text-white/70 group-hover:text-white">{title}</span>
    </motion.button>
  );
}

// --- 메인 화면 ---
export default function Home() {
  const router = useRouter();
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [password, setPassword] = useState("");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-16 text-center">
        <h1 className="text-5xl font-light tracking-[0.2em]">LOOKA</h1>
        <p className="mt-4 text-sm tracking-widest text-white/40">PREMIUM LOCATION ARCHIVE</p>
      </div>

      <div className="flex w-full max-w-2xl flex-col gap-6 sm:flex-row">
        <SelectionCard title="Production" icon={<Film />} onClick={() => setSelectedSection("Production")} delay={0.1} />
        <SelectionCard title="Agency" icon={<Briefcase />} onClick={() => setSelectedSection("Agency")} delay={0.2} />
      </div>

      <AnimatePresence>
        {selectedSection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelectedSection(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-2xl">
              <button onClick={() => setSelectedSection(null)} className="absolute right-6 top-6 text-white/40 hover:text-white"><X /></button>
              <h2 className="mb-6 text-center text-xl font-medium">{selectedSection} Access</h2>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl bg-black/40 py-4 text-center text-2xl outline-none" placeholder="••••" maxLength={4} autoFocus />
              <button onClick={() => password === "1234" ? router.push("/projects") : alert("Wrong Password")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 py-4 hover:bg-white/20">
                Enter Archive <ArrowRight size={18} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
