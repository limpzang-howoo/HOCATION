"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Film, Briefcase, Lock, ArrowRight, X } from "lucide-react";

type SectionType = "Production" | "Agency" | null;

export default function Home() {
  const router = useRouter();
  const [selectedSection, setSelectedSection] = useState<SectionType>(null);
  const [password, setPassword] = useState("");
  const[isError, setIsError] = useState(false);

  // 비밀번호 제출 핸들러 (실제로는 서버 검증 필요)
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "1234") { // 임시 비밀번호
      // 성공 시 애니메이션과 함께 라우팅
      router.push("/projects");
    } else {
      setIsError(true);
      setTimeout(() => setIsError(false), 500);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      {/* 로고 영역 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mb-16 text-center"
      >
        <h1 className="text-5xl font-light tracking-[0.2em] text-white/90 sm:text-6xl">
          LOOKA
        </h1>
        <p className="mt-4 text-sm font-light tracking-widest text-white/40">
          PREMIUM LOCATION ARCHIVE
        </p>
      </motion.div>

      {/* 섹션 선택 카드 */}
      <div className="flex w-full max-w-2xl flex-col gap-6 sm:flex-row">
        <SelectionCard
          title="Production"
          icon={<Film className="h-8 w-8 stroke-[1.5]" />}
          onClick={() => setSelectedSection("Production")}
          delay={0.1}
        />
        <SelectionCard
          title="Agency"
          icon={<Briefcase className="h-8 w-8 stroke-[1.5]" />}
          onClick={() => setSelectedSection("Agency")}
          delay={0.2}
        />
      </div>

      {/* 비밀번호 입력 모달 (Vision OS 글래스모피즘 스타일) */}
      <AnimatePresence>
        {selectedSection && (
          <>
            {/* 배경 블러 처리 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md"
              onClick={() => setSelectedSection(null)}
            />

            {/* 모달 창 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 p-4"
            >
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-2xl">
                {/* 닫기 버튼 */}
                <button
                  onClick={() => setSelectedSection(null)}
                  className="absolute right-4 top-4 rounded-full p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="mb-8 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                    <Lock className="h-5 w-5 text-white/80" />
                  </div>
                  <h2 className="text-xl font-medium text-white/90">
                    {selectedSection} Access
                  </h2>
                  <p className="mt-2 text-sm text-white/40">
                    접근 코드를 입력해주세요
                  </p>
                </div>

                <form onSubmit={handlePasswordSubmit}>
                  <motion.div
                    animate={isError ? { x: [-10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="relative"
                  >
                    <input
                      type="password"
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-6 py-4 text-center text-2xl tracking-[0.5em] text-white placeholder-white/20 outline-none backdrop-blur-md transition-all focus:border-white/30 focus:bg-white/5"
                      placeholder="••••"
                      maxLength={4}
                    />
                  </motion.div>

                  <button
                    type="submit"
                    className="group mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 py-4 text-sm font-medium text-white transition-all hover:bg-white/20 active:scale-[0.98]"
                  >
                    Enter Archive
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// 섹션 카드 컴포넌트
function SelectionCard({
  title,
  icon,
  onClick,
  delay,
}: {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  delay: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease:[0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="group relative flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-10 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.04]"
    >
      {/* 호버 시 나타나는 미세한 배경 글로우 */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      
      <div className="text-white/60 transition-colors duration-300 group-hover:text-white/90">
        {icon}
      </div>
      <span className="text-lg font-light tracking-wide text-white/70 transition-colors duration-300 group-hover:text-white">
        {title}
      </span>
    </motion.button>
  );
}
