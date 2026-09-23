"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Download, Loader2, Check } from "lucide-react";

// TODO: 실제로는 Supabase에 업로드된 폴더의 실제 사진 목록으로 교체.
// 지금은 구조/디자인 단계라 장소 slug를 시드로 한 고정 샘플 이미지 6장을 사용.
function samplePhotoSet(seed: string, count = 6): string[] {
  const key = encodeURIComponent(seed);
  return Array.from({ length: count }, (_, i) => `https://picsum.photos/seed/${key}-${i + 1}/600/450`);
}

type DownloadState = "idle" | "zipping" | "done" | "error";

export default function LocationPage() {
  const params = useParams();
  const id = params.id as string;
  const category = params.category as string;
  const location = params.location as string;

  const photos = samplePhotoSet(location);
  const [state, setState] = useState<DownloadState>("idle");

  async function handleDownloadAll() {
    if (state === "zipping") return;
    setState("zipping");
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const results = await Promise.all(
        photos.map(async (url, i) => {
          const res = await fetch(url);
          if (!res.ok) throw new Error("사진을 불러오지 못했습니다");
          const blob = await res.blob();
          return { name: `${location}_${String(i + 1).padStart(2, "0")}.jpg`, blob };
        })
      );
      results.forEach(({ name, blob }) => zip.file(name, blob));

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${location}.zip`;
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

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 mx-auto max-w-5xl"
      >
        <p className="mb-3 font-mono text-xs tracking-widest text-white/30">
          <Link href={`/production/${id}/${category}`} className="hover:text-[#deff9a] transition-colors">
            ← BACK
          </Link>
        </p>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-light tracking-widest text-white">{location.toUpperCase()}</h1>

          <button
            onClick={handleDownloadAll}
            disabled={state === "zipping"}
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

        {/* 사진 그리드 — 지금은 샘플 이미지, 실제 업로드 사진으로 추후 교체 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((src, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-[#0A0A0A]"
            >
              <img src={src} alt={`${location} 사진 ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
            </motion.div>
          ))}
        </div>

        <p className="mt-8 max-w-md text-sm font-light text-white/30">
          VR 파노라마 뷰어와 스파이셜 라이트박스는 다음 단계에서 여기 들어갈 예정입니다.
        </p>
      </motion.div>
    </div>
  );
}
