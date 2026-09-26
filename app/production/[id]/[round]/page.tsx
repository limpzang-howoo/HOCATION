"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Home, Coffee, Trees, Folder, Download, Loader2, Check } from "lucide-react";
import { supabase, locationPhotoUrl } from "../../../../lib/supabaseClient";
import { folderRound } from "../../../../lib/parseFolder";
import { zipAndDownload } from "../../../../lib/zipDownload";

// 관리자 페이지에서 만든 카테고리는 자유 이름이라, 알려진 slug만 전용 아이콘을 쓰고 나머진 기본 폴더 아이콘
const ICONS: Record<string, typeof Home> = { home: Home, cafe: Coffee, playground: Trees };

type DownloadState = "idle" | "zipping" | "done" | "error";
type CategoryRow = { slug: string; name: string; sort_order: number };
type FolderRow = { id: string; category: string; folder_name: string; mmdd: string; label: string; round: number | null };

export default function RoundPage() {
  const params = useParams();
  const id = params.id as string;
  const round = Number(params.round);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [roundFolders, setRoundFolders] = useState<FolderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<DownloadState>("idle");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase || !Number.isFinite(round)) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data: cats } = await supabase
        .from("categories")
        .select("slug,name,sort_order")
        .eq("brand_id", Number(id))
        .order("sort_order", { ascending: true });
      if (!cancelled) setCategories(cats ?? []);

      const { data: allFolders } = await supabase
        .from("folders")
        .select("id,category,folder_name,mmdd,label,round")
        .eq("brand_id", Number(id));
      const matched = (allFolders ?? []).filter((f: FolderRow) => folderRound(f) === round);
      if (!cancelled) {
        setRoundFolders(matched);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, round]);

  const spaceCards = categories.filter((c) => roundFolders.some((f) => f.category === c.slug));
  const knownSlugs = new Set(spaceCards.map((c) => c.slug));
  // 카테고리 테이블에 없는(예전 방식으로 만들어진) slug도 놓치지 않기 위한 보정
  const extraSlugs = Array.from(new Set(roundFolders.map((f) => f.category))).filter((s) => !knownSlugs.has(s));

  async function handleDownloadAll() {
    if (!supabase || state === "zipping" || roundFolders.length === 0) return;
    setState("zipping");
    try {
      const folderIds = roundFolders.map((f) => f.id);
      const folderCat = new Map(roundFolders.map((f) => [f.id, f.category]));
      const catNameOf = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;

      const { data: locs } = await supabase.from("locations").select("id,name,folder_id").in("folder_id", folderIds);
      const locList = locs ?? [];
      if (locList.length === 0) throw new Error("사진이 없습니다");

      const { data: photoRows } = await supabase
        .from("photos")
        .select("id,storage_path,sort_order,location_id")
        .in(
          "location_id",
          locList.map((l: any) => l.id)
        )
        .order("sort_order", { ascending: true });

      const entries: { url: string; name: string }[] = [];
      locList.forEach((l: any) => {
        const spaceName = catNameOf(folderCat.get(l.folder_id) ?? "");
        const photosOfLoc = (photoRows ?? []).filter((p: any) => p.location_id === l.id);
        photosOfLoc.forEach((p: any, i: number) => {
          entries.push({
            url: locationPhotoUrl(p.storage_path),
            name: `${spaceName}/${l.name}_${String(i + 1).padStart(2, "0")}.jpg`,
          });
        });
      });

      await zipAndDownload(entries, `${round}차_전체`);
      setState("done");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2500);
    }
  }

  return (
    <div className="relative min-h-screen bg-black px-4 py-10 sm:px-8 sm:py-16">
      <div className="pointer-events-none fixed left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[#deff9a]/[0.04] blur-[140px]" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 mb-4 font-mono text-xs font-light tracking-widest text-white/30"
      >
        <Link href="/" className="hover:text-[#deff9a] transition-colors">
          ARCHIVE
        </Link>{" "}
        /{" "}
        <Link href={`/production/${id}`} className="hover:text-[#deff9a] transition-colors">
          BRAND {String(id).padStart(2, "0")}
        </Link>{" "}
        / <span className="text-[#deff9a]">{Number.isFinite(round) ? `${round}차` : round}</span>
      </motion.div>

      <div className="relative z-10 mb-10 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-light tracking-[0.2em] text-white sm:text-3xl">
          {Number.isFinite(round) ? round : "?"}
          <span className="text-[#deff9a]">차</span>
        </h1>
        <button
          onClick={handleDownloadAll}
          disabled={state === "zipping" || roundFolders.length === 0}
          className="flex items-center gap-2 rounded-md bg-[#deff9a] px-4 py-2 text-xs font-medium tracking-widest text-black shadow-lg shadow-black/40 transition-all hover:bg-[#deff9a]/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {state === "zipping" && <Loader2 size={14} className="animate-spin" />}
          {state === "done" && <Check size={14} />}
          {state === "idle" && <Download size={14} />}
          {state === "zipping" && "압축 중..."}
          {state === "done" && "다운로드 완료"}
          {state === "error" && "다시 시도"}
          {state === "idle" && "회차 전체 다운로드 (ZIP)"}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-white/20">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : spaceCards.length === 0 && extraSlugs.length === 0 ? (
        <p className="py-16 text-center text-xs tracking-widest text-white/20">이 회차에 등록된 공간이 없습니다</p>
      ) : (
        <div className="relative z-10 mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
          {spaceCards.map((cat, idx) => {
            const Icon = ICONS[cat.slug] ?? Folder;
            return (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
              >
                <Link
                  href={`/production/${id}/${round}/${cat.slug}`}
                  className="group flex flex-col items-center justify-center gap-4 rounded-[1.5rem] border border-white/10 bg-[#0A0A0A] px-6 py-14 text-center transition-all duration-300 hover:border-[#deff9a]/40 hover:bg-[#deff9a]/[0.04]"
                >
                  <Icon size={32} strokeWidth={1} className="text-white/40 group-hover:text-[#deff9a] transition-colors" />
                  <span className="text-sm font-light tracking-widest text-white/70 group-hover:text-white">{cat.name}</span>
                </Link>
              </motion.div>
            );
          })}
          {extraSlugs.map((slug, idx) => (
            <motion.div
              key={slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: (spaceCards.length + idx) * 0.08 }}
            >
              <Link
                href={`/production/${id}/${round}/${slug}`}
                className="group flex flex-col items-center justify-center gap-4 rounded-[1.5rem] border border-white/10 bg-[#0A0A0A] px-6 py-14 text-center transition-all duration-300 hover:border-[#deff9a]/40 hover:bg-[#deff9a]/[0.04]"
              >
                <Folder size={32} strokeWidth={1} className="text-white/40 group-hover:text-[#deff9a] transition-colors" />
                <span className="text-sm font-light tracking-widest text-white/70 group-hover:text-white">{slug}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
