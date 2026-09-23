"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Folder, Loader2 } from "lucide-react";
import { supabase } from "../../../../lib/supabaseClient";

type FolderRow = { id: string; folder_name: string; mmdd: string; label: string };

export default function CategoryPage() {
  const params = useParams();
  const id = params.id as string;
  const category = params.category as string;

  const [categoryName, setCategoryName] = useState(category);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) {
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

      const { data } = await supabase
        .from("folders")
        .select("id,folder_name,mmdd,label")
        .eq("brand_id", Number(id))
        .eq("category", category)
        .order("mmdd", { ascending: false });
      if (!cancelled) {
        setFolders(data ?? []);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, category]);

  return (
    <div className="relative min-h-screen bg-black px-4 py-10 sm:px-8 sm:py-16">
      <div className="pointer-events-none fixed left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[#deff9a]/[0.04] blur-[140px]" />

      {/* 브레드크럼 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 mb-12 font-mono text-xs font-light tracking-widest text-white/30"
      >
        <Link href="/" className="hover:text-[#deff9a] transition-colors">
          ARCHIVE
        </Link>{" "}
        /{" "}
        <Link href={`/production/${id}`} className="hover:text-[#deff9a] transition-colors">
          BRAND {String(id).padStart(2, "0")}
        </Link>{" "}
        / <span className="text-[#deff9a]">{categoryName.toUpperCase()}</span>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-16 text-white/20">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : folders.length === 0 ? (
        <p className="py-16 text-center text-xs tracking-widest text-white/20">아직 등록된 폴더가 없습니다</p>
      ) : (
        <div className="relative z-10 mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-5">
          {folders.map((f, idx) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href={`/production/${id}/${category}/${f.id}`}
                className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#0A0A0A] px-4 py-10 text-center transition-all duration-300 hover:border-[#deff9a]/40 hover:bg-[#deff9a]/[0.04]"
              >
                <Folder size={26} strokeWidth={1} className="text-white/30 group-hover:text-[#deff9a] transition-colors" />
                <span className="text-xs font-light tracking-widest text-white/60 group-hover:text-white">
                  {f.folder_name}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
