"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Download, Loader2, Check, ImageOff } from "lucide-react";
import { supabase, locationPhotoUrl } from "../../../../../lib/supabaseClient";

type DownloadState = "idle" | "zipping" | "done" | "error";
type Photo = { id: string; url: string };

// 라우트 파라미터명은 "location"이지만 실제로는 폴더(folder) id.
export default function FolderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const category = params.category as string;
  const folderId = params.location as string;

  const [folderName, setFolderName] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<DownloadState>("idle");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data: folder } = await supabase
        .from("folders")
        .select("id,folder_name")
        .eq("id", folderId)
        .single();
      if (cancelled) return;
      if (folder) setFolderName(folder.folder_name);

      const { data: locs } = await supabase.from("locations").select("id").eq("folder_id", folderId);
      const locIds = (locs ?? []).map((l: any) => l.id);
      if (locIds.length === 0) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data: photoRows } = await supabase
        .from("photos")
        .select("id,storage_path,sort_order")
        .in("location_id", locIds)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      setPhotos((photoRows ?? []).map((p: any) => ({ id: p.id, url: locationPhotoUrl(p.storage_path) })));
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [folderId]);

  async function handleDownloadAll() {
    if (state === "zipping" || photos.length === 0) return;
    setState("zipping");
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const results = await Promise.all(
        photos.map(async (p, i) => {
          const res = await fetch(p.url);
          if (!res.ok) throw new Error("사진을 불러오지 못했습니다");
          const blob = await res.blob();
          return { name: `${folderName || folderId}_${String(i + 1).padStart(2, "0")}.jpg`, blob };
        })
      );
      results.forEach(({ name, blob }) => zip.file(name, blob));

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName || folderId}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

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

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 mx-auto max-w-5xl">
        <p className="mb-3 font-mono text-xs tracking-widest text-white/30">
          <Link href={`/production/${id}/${category}`} className="hover:text-[#deff9a] transition-colors">
            ← BACK
          </Link>
        </p>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-light tracking-widest text-white">
            {(folderName || "LOADING").toUpperCase()}
          </h1>

          <button
            onClick={handleDownloadAll}
            disabled={state === "zipping" || photos.length === 0}
            className="flex items-center gap-2 rounded-md bg-[#deff9a] px-4 py-2 text-xs font-medium tracking-widest text-black shadow-lg shadow-black/40 transition-all hover:bg-[#deff9a]/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {state === "zipping" && <Loader2 size={14} className="animate-spin" />}
            {state === "done" && <Check size={14} />}
            {state === "idle" && <Download size={14} />}
            {state === "zipping" && "압축 중..."}
            {state === "done" && "다운로드 완료"}
            {state === "error" && "다시 시도"}
            {state === "idle" && "전체 다운로드 (ZIP)"}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-white/20">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-white/20">
            <ImageOff size={22} strokeWidth={1} />
            <p className="text-xs tracking-widest">아직 업로드된 사진이 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-[#0A0A0A]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`${folderName} 사진 ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
