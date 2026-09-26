"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Folder } from "lucide-react";
import PasswordGate from "../../components/PasswordGate";
import { supabase } from "../../../lib/supabaseClient";
import { folderRound } from "../../../lib/parseFolder";

const KakaoMapWidget = dynamic(() => import("../../components/KakaoMapWidget"), {
  ssr: false,
  loading: () => (
    <div className="flex h-56 items-center justify-center rounded-2xl border border-white/10 bg-[#0A0A0A] text-xs tracking-widest text-white/20">
      KAKAO MAP LOADING...
    </div>
  ),
});

const WeatherWidget = dynamic(() => import("../../components/WeatherWidget"), {
  ssr: false,
  loading: () => (
    <div className="flex h-56 items-center justify-center rounded-2xl border border-white/10 bg-[#0A0A0A] text-xs tracking-widest text-white/20">
      WEATHER LOADING...
    </div>
  ),
});

type FolderRow = { category: string; mmdd: string; label: string; round: number | null };
type RoundSummary = { round: number; mmdd: string; spaceCount: number };

export default function ProductionPage() {
  const params = useParams();
  const id = params.id as string;
  const [accessCode, setAccessCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) {
        if (!cancelled) setAccessCode("1234");
        return;
      }
      const { data } = await supabase.from("brands").select("access_code").eq("id", Number(id)).single();
      if (!cancelled) setAccessCode(data?.access_code || "1234");
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (accessCode === null) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <PasswordGate
      storageKey={`looka_prod_auth_${id}`}
      correctPassword={accessCode}
      title={`PRODUCTION ${String(id).padStart(2, "0")}`}
      subtitle="ENTER ACCESS CODE"
    >
      <ProductionContent id={id} />
    </PasswordGate>
  );
}

function ProductionContent({ id }: { id: string }) {
  const [rounds, setRounds] = useState<RoundSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("folders")
        .select("category,mmdd,label,round")
        .eq("brand_id", Number(id));
      if (cancelled) return;

      const byRound = new Map<number, { mmdd: string; spaces: Set<string> }>();
      (data ?? []).forEach((f: FolderRow) => {
        const r = folderRound(f);
        if (r == null) return;
        const cur = byRound.get(r) ?? { mmdd: f.mmdd, spaces: new Set<string>() };
        if (f.mmdd && (!cur.mmdd || f.mmdd < cur.mmdd)) cur.mmdd = f.mmdd; // 가장 이른 날짜를 대표로
        cur.spaces.add(f.category);
        byRound.set(r, cur);
      });
      const list: RoundSummary[] = Array.from(byRound.entries())
        .map(([round, v]) => ({ round, mmdd: v.mmdd, spaceCount: v.spaces.size }))
        .sort((a, b) => b.round - a.round);
      setRounds(list);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="relative min-h-screen bg-black px-4 py-10 sm:px-8 sm:py-16">
      <div className="pointer-events-none fixed left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[#deff9a]/[0.04] blur-[140px]" />

      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 mb-4 text-xs font-light tracking-widest text-white/30"
      >
        <Link href="/" className="hover:text-[#deff9a] transition-colors">
          ARCHIVE
        </Link>{" "}
        / BRAND {String(id).padStart(2, "0")}
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="relative z-10 mb-12 text-2xl font-light tracking-[0.2em] text-white sm:text-3xl"
      >
        BRAND <span className="text-[#deff9a]">{String(id).padStart(2, "0")}</span>
      </motion.h1>

      {/* Mac Finder 스타일 회차 폴더 — 최신 회차가 맨 앞 */}
      {loading ? null : rounds.length === 0 ? (
        <p className="relative z-10 py-8 text-center text-xs tracking-widest text-white/20">
          아직 등록된 자료가 없습니다
        </p>
      ) : (
        <div className="relative z-10 mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
          {rounds.map((r, idx) => (
            <motion.div
              key={r.round}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + idx * 0.08 }}
            >
              <Link
                href={`/production/${id}/${r.round}`}
                className="group flex flex-col items-center justify-center gap-2 rounded-[1.5rem] border border-white/10 bg-[#0A0A0A] px-6 py-14 text-center transition-all duration-300 hover:border-[#deff9a]/40 hover:bg-[#deff9a]/[0.04]"
              >
                <Folder size={32} strokeWidth={1} className="text-white/40 group-hover:text-[#deff9a] transition-colors" />
                <span className="text-sm font-light tracking-widest text-white/70 group-hover:text-white">{r.round}차</span>
                {r.mmdd?.length === 4 && (
                  <span className="text-[10px] tracking-widest text-white/25">
                    {r.mmdd.slice(0, 2)}/{r.mmdd.slice(2, 4)}
                  </span>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* 하단 HUD: 지도 / 날씨 (좌우 대칭) */}
      <div className="relative z-10 mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
        <KakaoMapWidget brandId={id} />
        <WeatherWidget />
      </div>
    </div>
  );
}
