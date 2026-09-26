"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Download, Loader2, Check, ImageOff } from "lucide-react";
import { supabase, locationPhotoUrl } from "../../../../../lib/supabaseClient";
import { folderRound } from "../../../../../lib/parseFolder";
import { zipAndDownload } from "../../../../../lib/zipDownload";
import LocationReportCard from "../../../../components/LocationReportCard";
import { ReportData } from "../../../../../lib/reportFields";

type DownloadState = "idle" | "zipping" | "done" | "error";
type Photo = { id: string; url: string };
type LocationGroup = {
  id: string;
  name: string;
  address: string | null;
  shootDate: string | null;
  report: ReportData | null;
  photos: Photo[];
};

export default function RoundCategoryPage() {
  const params = useParams();
  const id = params.id as string;
  const round = Number(params.round);
  const category = params.category as string;

  const [categoryName, setCategoryName] = useState(category);
  const [groups, setGroups] = useState<LocationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<DownloadState>("idle");
  const [locState, setLocState] = useState<Record<string, DownloadState>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase || !Number.isFinite(round)) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data: cat } = await supabase
        .from("categories")
        .select("name")
        .eq("brand_id", Number(id))
        .eq("slug", category)
        .single();
      if (!cancelled && cat) setCategoryName(cat.name);

      const { data: allFolders } = await supabase
        .from("folders")
        .select("id,category,label,round")
        .eq("brand_id", Number(id))
        .eq("category", category);
      const folderIds = (allFolders ?? []).filter((f: any) => folderRound(f) === round).map((f: any) => f.id);
      if (cancelled) return;
      if (folderIds.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      // shoot_date/report 컬럼이 아직 없는 구DB에서도 죽지 않도록 구버전 select로 한 번 더 시도
      const query = (withNew: boolean) =>
        supabase!
          .from("locations")
          .select(`id,name,address,sort_order${withNew ? ",shoot_date,report" : ""}`)
          .in("folder_id", folderIds)
          .order("sort_order", { ascending: true });
      let res: any = await query(true);
      if (res.error) res = await query(false);
      const locs: any[] = res.data ?? [];
      if (cancelled) return;
      if (locs.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      const { data: photoRows } = await supabase
        .from("photos")
        .select("id,storage_path,sort_order,location_id")
        .in(
          "location_id",
          locs.map((l) => l.id)
        )
        .order("sort_order", { ascending: true });
      if (cancelled) return;

      setGroups(
        locs.map((l) => ({
          id: l.id,
          name: l.name,
          address: l.address ?? null,
          shootDate: l.shoot_date ?? null,
          report: l.report ?? null,
          photos: (photoRows ?? [])
            .filter((p: any) => p.location_id === l.id)
            .map((p: any) => ({ id: p.id, url: locationPhotoUrl(p.storage_path) })),
        }))
      );
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, category, round]);

  function buildEntries(g: LocationGroup) {
    return g.photos.map((p, i) => ({ url: p.url, name: `${g.name}_${String(i + 1).padStart(2, "0")}.jpg` }));
  }
  const allEntries = groups.flatMap(buildEntries);

  async function handleDownloadAll() {
    if (state === "zipping" || allEntries.length === 0) return;
    setState("zipping");
    try {
      await zipAndDownload(allEntries, `${categoryName || category}_${round}차`);
      setState("done");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2500);
    }
  }

  async function handleDownloadLocation(g: LocationGroup) {
    if (locState[g.id] === "zipping" || g.photos.length === 0) return;
    setLocState((prev) => ({ ...prev, [g.id]: "zipping" }));
    try {
      await zipAndDownload(buildEntries(g), g.name || g.id);
      setLocState((prev) => ({ ...prev, [g.id]: "done" }));
      setTimeout(() => setLocState((prev) => ({ ...prev, [g.id]: "idle" })), 2000);
    } catch {
      setLocState((prev) => ({ ...prev, [g.id]: "error" }));
      setTimeout(() => setLocState((prev) => ({ ...prev, [g.id]: "idle" })), 2500);
    }
  }

  return (
    <div className="relative min-h-screen bg-black px-4 py-10 sm:px-8 sm:py-16">
      <div className="pointer-events-none fixed left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[#deff9a]/[0.04] blur-[140px]" />

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 mx-auto max-w-5xl">
        <p className="mb-3 font-mono text-xs tracking-widest text-white/30">
          <Link href={`/production/${id}/${round}`} className="hover:text-[#deff9a] transition-colors">
            ← BACK
          </Link>
        </p>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-light tracking-widest text-white">
            {categoryName.toUpperCase()} <span className="text-[#deff9a]">· {round}차</span>
          </h1>

          <button
            onClick={handleDownloadAll}
            disabled={state === "zipping" || allEntries.length === 0}
            className="flex items-center gap-2 rounded-md bg-[#deff9a] px-4 py-2 text-xs font-medium tracking-widest text-black shadow-lg shadow-black/40 transition-all hover:bg-[#deff9a]/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {state === "zipping" && <Loader2 size={14} className="animate-spin" />}
            {state === "done" && <Check size={14} />}
            {state === "idle" && <Download size={14} />}
            {state === "zipping" && "압축 중..."}
            {state === "done" && "다운로드 완료"}
            {state === "error" && "다시 시도"}
            {state === "idle" && `이 공간 전체 다운로드 (ZIP, ${allEntries.length}장)`}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-white/20">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-white/20">
            <ImageOff size={22} strokeWidth={1} />
            <p className="text-xs tracking-widest">아직 등록된 장소가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-12">
            {groups.map((g, gi) => {
              const gState = locState[g.id] ?? "idle";
              return (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: gi * 0.06 }}
                  className="space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <LocationReportCard name={g.name} address={g.address} shootDate={g.shootDate} report={g.report} />
                    <button
                      onClick={() => handleDownloadLocation(g)}
                      disabled={gState === "zipping" || g.photos.length === 0}
                      className="flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-2 text-[11px] font-medium tracking-widest text-white/60 transition-all hover:border-[#deff9a]/40 hover:text-[#deff9a] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {gState === "zipping" && <Loader2 size={12} className="animate-spin" />}
                      {gState === "done" && <Check size={12} />}
                      {gState === "idle" && <Download size={12} />}
                      {gState === "zipping" && "압축 중..."}
                      {gState === "done" && "완료"}
                      {gState === "error" && "다시 시도"}
                      {gState === "idle" && `이 장소만 (${g.photos.length}장)`}
                    </button>
                  </div>

                  {g.photos.length === 0 ? (
                    <p className="text-[11px] text-white/20">아직 업로드된 사진이 없습니다</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {g.photos.map((p, i) => (
                        <div key={p.id} className="aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-[#0A0A0A]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.url} alt={`${g.name} 사진 ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
