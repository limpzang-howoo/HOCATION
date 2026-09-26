"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ArrowRight } from "lucide-react";

export default function PasswordGate({
  storageKey,
  correctPassword,
  title,
  subtitle,
  children,
}: {
  storageKey: string;
  correctPassword: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setUnlocked(sessionStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password === correctPassword) {
      sessionStorage.setItem(storageKey, "1");
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  }

  // 세션 확인 전까지는 깜빡임 방지를 위해 빈 화면
  if (unlocked === null) {
    return <div className="min-h-screen bg-black" />;
  }

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black px-6">
      <div className="pointer-events-none fixed left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[#deff9a]/[0.05] blur-[140px]" />
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.02] p-10 text-center backdrop-blur-2xl sm:p-12"
        >
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-[#deff9a]/20 bg-[#deff9a]/[0.06]">
            <Lock size={22} className="text-[#deff9a]" />
          </div>
          <h2 className="text-lg font-light tracking-[0.2em] text-white">{title}</h2>
          {subtitle && (
            <p className="mt-2 text-xs font-light tracking-widest text-white/30">{subtitle}</p>
          )}
          <form onSubmit={handleSubmit} className="mt-8">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              className={`w-full rounded-2xl border bg-white/5 py-4 text-center text-2xl tracking-[0.5em] text-white outline-none transition-all ${
                error ? "border-red-500/50" : "border-white/10 focus:border-[#deff9a]/40"
              }`}
              placeholder="••••"
              autoFocus
            />
            {error && (
              <p className="mt-3 text-xs font-light tracking-widest text-red-400/80">
                비밀번호가 올바르지 않습니다
              </p>
            )}
            <button
              type="submit"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#deff9a] py-4 text-sm font-medium text-black transition-transform active:scale-[0.98] hover:bg-[#deff9a]/90"
            >
              ACCESS <ArrowRight size={16} />
            </button>
          </form>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
