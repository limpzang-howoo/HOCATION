"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Coffee, Trees, Folder } from "lucide-react";
import PasswordGate from "../../components/PasswordGate";
import { supabase } from "../../../lib/supabaseClient";

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

// 관리자 페이지에서 만든 카테고리는 자유 이름이라, 알려진 slug만 전용 아이콘을 쓰고 나머진 기본 폴더 아이콘
const ICONS: Record<string, typeof Home> = { home: Home, cafe: Coffee, playground: Trees };

type CategoryRow = { slug: string; name: string };

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
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) return;
      const { data } = await supabase
        .from("categories")
        .select("slug,name")
        .eq("brand_id", Number(id))
        .order("sort_order", { ascending: true });
      if (!cancelled) setCategories(data ?? []);
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

      {/* Mac Finder 스타일 공간 폴더 — 관리자 페이지에서 만든 카테고리 */}
      <div className="relative z-10 mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
        {categories.map((cat, idx) => {
          const Icon = ICONS[cat.slug] ?? Folder;
          return (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + idx * 0.08 }}
            >
              <Link
                href={`/production/${id}/${cat.slug}`}
                className="group flex flex-col items-center justify-center gap-4 rounded-[1.5rem] border border-white/10 bg-[#0A0A0A] px-6 py-14 text-center transition-all duration-300 hover:border-[#deff9a]/40 hover:bg-[#deff9a]/[0.04]"
              >
                <Icon size={32} strokeWidth={1} className="text-white/40 group-hover:text-[#deff9a] transition-colors" />
                <span className="text-sm font-light tracking-widest text-white/70 group-hover:text-white">
                  {cat.name}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* 하단 HUD: 지도 / 날씨 (좌우 대칭) */}
      <div className="relative z-10 mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
        <KakaoMapWidget brandId={id} />
        <WeatherWidget />
      </div>
    </div>
  );
}
