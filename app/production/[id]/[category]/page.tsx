"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Folder } from "lucide-react";

const CATEGORY_NAMES: Record<string, string> = {
  home: "집 공간",
  cafe: "카페 공간",
  playground: "운동장 공간",
};

export default function CategoryPage() {
  const params = useParams();
  const id = params.id as string;
  const category = params.category as string;
  const categoryName = CATEGORY_NAMES[category] ?? category;

  const locations = Array.from({ length: 10 }, (_, i) => ({
    slug: `loc-${String(i + 1).padStart(2, "0")}`,
    name: `${categoryName} ${i + 1}`,
  }));

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

      <div className="relative z-10 mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-5">
        {locations.map((loc, idx) => (
          <motion.div
            key={loc.slug}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              href={`/production/${id}/${category}/${loc.slug}`}
              className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#0A0A0A] px-4 py-10 text-center transition-all duration-300 hover:border-[#deff9a]/40 hover:bg-[#deff9a]/[0.04]"
            >
              <Folder size={26} strokeWidth={1} className="text-white/30 group-hover:text-[#deff9a] transition-colors" />
              <span className="text-xs font-light tracking-widest text-white/60 group-hover:text-white">
                {loc.name}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
