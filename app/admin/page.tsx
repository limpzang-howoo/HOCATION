"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Building2, Plus, Trash2, Pencil, Check, X, Loader2, Eye, EyeOff } from "lucide-react";
import PasswordGate from "../components/PasswordGate";
import { supabase } from "../../lib/supabaseClient";
import { ADMIN_TOKEN } from "../../lib/adminToken";

type BrandRow = { id: number; name: string; access_code: string };

async function adminFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init?.headers ?? {}), "x-admin-key": ADMIN_TOKEN },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? `요청 실패 (${res.status})`);
  return json;
}

export default function AdminHomePage() {
  return (
    <PasswordGate storageKey="looka_admin_master" correctPassword="9284" title="ADMIN" subtitle="전체 프로덕션 관리">
      <AdminHomeContent />
    </PasswordGate>
  );
}

function AdminHomeContent() {
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const loadBrands = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase.from("brands").select("id,name,access_code").order("id", { ascending: true });
    setBrands(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  // ── 새 프로덕션 ──
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [saving, setSaving] = useState(false);

  async function createBrand() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await adminFetch("/api/admin/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), access_code: newCode.trim() }),
      });
      setNewName("");
      setNewCode("");
      setNewOpen(false);
      await loadBrands();
      notify("프로덕션을 만들었어요");
    } catch (e: any) {
      notify(e.message ?? "생성 실패");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBrand(brand: BrandRow) {
    if (!confirm(`"${brand.name}" 프로덕션을 삭제할까요?\n안의 모든 카테고리·폴더·사진이 함께 삭제됩니다.`)) return;
    try {
      await adminFetch(`/api/admin/brands/${brand.id}`, { method: "DELETE" });
      await loadBrands();
      notify("프로덕션을 삭제했어요");
    } catch (e: any) {
      notify(e.message ?? "삭제 실패");
    }
  }

  // ── 이름/비밀번호 수정 ──
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");

  function startEdit(brand: BrandRow) {
    setEditingId(brand.id);
    setEditName(brand.name);
    setEditCode(brand.access_code);
  }

  async function saveEdit() {
    if (editingId === null) return;
    try {
      await adminFetch(`/api/admin/brands/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), access_code: editCode.trim() }),
      });
      setEditingId(null);
      await loadBrands();
      notify("수정했어요");
    } catch (e: any) {
      notify(e.message ?? "수정 실패");
    }
  }

  return (
    <div className="relative min-h-screen bg-black px-4 py-10 sm:px-8 sm:py-16">
      <div className="pointer-events-none fixed left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[#deff9a]/[0.04] blur-[140px]" />

      <div className="relative z-10 mb-2 font-mono text-xs font-light tracking-widest text-white/30">
        <span className="text-[#deff9a]">ADMIN</span> / 전체 프로덕션
      </div>
      <h1 className="relative z-10 mb-8 text-xl font-light tracking-[0.2em] text-white">
        프로덕션 <span className="text-[#deff9a]">관리</span>
      </h1>

      {loading ? (
        <div className="flex justify-center py-16 text-white/20">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <div className="relative z-10 mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => {
            const isEditing = editingId === brand.id;
            return (
              <div
                key={brand.id}
                className="group relative rounded-2xl border border-white/10 bg-[#0A0A0A] p-5 transition-all hover:border-[#deff9a]/30"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="프로덕션 이름"
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[#deff9a]/40"
                    />
                    <input
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value)}
                      placeholder="접속 비밀번호"
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[#deff9a]/40"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="flex-1 rounded-lg bg-[#deff9a] py-2 text-xs font-medium text-black"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 hover:text-white"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Link href={`/admin/${brand.id}`} className="block">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/30 transition-colors group-hover:border-[#deff9a]/30 group-hover:text-[#deff9a]">
                        <Building2 size={18} strokeWidth={1.5} />
                      </div>
                      <div className="text-sm font-light text-white">{brand.name}</div>
                      <div className="mt-0.5 text-[10px] tracking-widest text-white/25">
                        BRAND {String(brand.id).padStart(2, "0")}
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-white/30">
                        접속코드:{" "}
                        <span className="font-mono text-white/50">
                          {revealed[brand.id] ? brand.access_code : "••••"}
                        </span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setRevealed((r) => ({ ...r, [brand.id]: !r[brand.id] }));
                          }}
                          className="text-white/20 hover:text-white/60"
                        >
                          {revealed[brand.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </div>
                    </Link>

                    <div className="absolute right-4 top-4 hidden items-center gap-2 group-hover:flex">
                      <button
                        onClick={() => startEdit(brand)}
                        className="text-white/25 hover:text-white"
                        title="이름/비밀번호 수정"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => deleteBrand(brand)}
                        className="text-white/25 hover:text-red-400"
                        title="프로덕션 삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {newOpen ? (
            <div className="space-y-2 rounded-2xl border border-[#deff9a]/20 bg-[#deff9a]/[0.04] p-5">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="프로덕션 이름 (예: 브랜드 04)"
                autoFocus
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[#deff9a]/40"
              />
              <input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="접속 비밀번호 (비우면 1234)"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[#deff9a]/40"
              />
              <div className="flex gap-2">
                <button
                  onClick={createBrand}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-[#deff9a] py-2 text-xs font-medium text-black disabled:opacity-50"
                >
                  {saving ? "만드는 중..." : "만들기"}
                </button>
                <button
                  onClick={() => setNewOpen(false)}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 hover:text-white"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setNewOpen(true)}
              className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 text-white/40 transition-colors hover:border-[#deff9a]/40 hover:text-[#deff9a]"
            >
              <Plus size={20} strokeWidth={1.5} />
              <span className="text-xs tracking-widest">새 프로덕션</span>
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#0A0A0A] px-5 py-3 text-xs text-white shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
