"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Folder,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
  Upload,
  Loader2,
  ImageOff,
} from "lucide-react";
import PasswordGate from "../../components/PasswordGate";
import { supabase, locationPhotoUrl } from "../../../lib/supabaseClient";
import { ADMIN_TOKEN } from "../../../lib/adminToken";

type CategoryRow = { id: string; slug: string; name: string; sort_order: number };
type FolderRow = { id: string; category: string; folder_name: string; mmdd: string; label: string };
type PhotoRow = { id: string; storage_path: string; sort_order: number };

async function adminFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init?.headers ?? {}), "x-admin-key": ADMIN_TOKEN },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? `요청 실패 (${res.status})`);
  return json;
}

export default function AdminPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <PasswordGate storageKey="looka_admin_master" correctPassword="9284" title="ADMIN" subtitle="관리자 전용 페이지">
      <AdminContent brandId={id} />
    </PasswordGate>
  );
}

function AdminContent({ brandId }: { brandId: string }) {
  const [toast, setToast] = useState<string | null>(null);
  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // ── 카테고리 ──
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryRow | null>(null);

  const loadCategories = useCallback(async () => {
    if (!supabase) return;
    setCategoriesLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("id,slug,name,sort_order")
      .eq("brand_id", Number(brandId))
      .order("sort_order", { ascending: true });
    if (error) {
      notify("카테고리 테이블이 아직 없어요 — 마이그레이션 SQL을 먼저 실행해줘");
      setCategories([]);
      setCategoriesLoading(false);
      return;
    }
    setCategories(data ?? []);
    setSelectedCategory((prev) => prev ?? (data && data.length > 0 ? data[0] : null));
    setCategoriesLoading(false);
  }, [brandId]);

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId]);

  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [savingCat, setSavingCat] = useState(false);

  async function createCategory() {
    if (!newCatName.trim()) return;
    setSavingCat(true);
    try {
      const res = await adminFetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_id: Number(brandId), name: newCatName.trim() }),
      });
      setNewCatName("");
      setNewCatOpen(false);
      await loadCategories();
      if (res.category) setSelectedCategory(res.category);
      notify("카테고리를 추가했어요");
    } catch (e: any) {
      notify(e.message ?? "카테고리 추가 실패");
    } finally {
      setSavingCat(false);
    }
  }

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");

  async function saveEditCategory() {
    if (!editingCatId || !editingCatName.trim()) {
      setEditingCatId(null);
      return;
    }
    try {
      await adminFetch(`/api/admin/categories/${editingCatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingCatName.trim() }),
      });
      setEditingCatId(null);
      await loadCategories();
    } catch (e: any) {
      notify(e.message ?? "이름 변경 실패");
    }
  }

  async function deleteCategory(cat: CategoryRow) {
    if (!confirm(`"${cat.name}" 카테고리를 삭제할까요?\n안의 폴더와 사진이 모두 함께 삭제됩니다.`)) return;
    try {
      await adminFetch(`/api/admin/categories/${cat.id}`, { method: "DELETE" });
      if (selectedCategory?.id === cat.id) setSelectedCategory(null);
      await loadCategories();
      notify("카테고리를 삭제했어요");
    } catch (e: any) {
      notify(e.message ?? "카테고리 삭제 실패");
    }
  }

  // ── 폴더 ──
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FolderRow | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);

  const loadFolders = useCallback(async () => {
    if (!supabase || !selectedCategory) {
      setFolders([]);
      return;
    }
    setFoldersLoading(true);
    const { data } = await supabase
      .from("folders")
      .select("id,category,folder_name,mmdd,label")
      .eq("brand_id", Number(brandId))
      .eq("category", selectedCategory.slug)
      .order("mmdd", { ascending: false });
    setFolders(data ?? []);
    setFoldersLoading(false);
  }, [brandId, selectedCategory]);

  useEffect(() => {
    setSelectedFolder(null);
    setLocationId(null);
    setPhotos([]);
    loadFolders();
  }, [loadFolders]);

  const loadPhotos = useCallback(async (locId: string) => {
    if (!supabase) return;
    setPhotosLoading(true);
    const { data } = await supabase
      .from("photos")
      .select("id,storage_path,sort_order")
      .eq("location_id", locId)
      .order("sort_order", { ascending: true });
    setPhotos(data ?? []);
    setPhotosLoading(false);
  }, []);

  // 폴더 하나당 사진을 걸어둘 "장소"를 화면에 노출하지 않고 자동으로 마련해줌
  async function ensureLocation(folder: FolderRow): Promise<string | null> {
    if (!supabase) return null;
    const { data } = await supabase.from("locations").select("id").eq("folder_id", folder.id).limit(1);
    if (data && data.length > 0) return data[0].id;
    try {
      const res = await adminFetch("/api/admin/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: folder.id, name: folder.label, address: "" }),
      });
      return res.location?.id ?? null;
    } catch (e: any) {
      notify(e.message ?? "장소 준비 실패");
      return null;
    }
  }

  async function openFolder(folder: FolderRow) {
    setSelectedFolder(folder);
    setPhotos([]);
    setPhotosLoading(true);
    const locId = await ensureLocation(folder);
    setLocationId(locId);
    if (locId) await loadPhotos(locId);
    setPhotosLoading(false);
  }

  // ── 새 폴더 ──
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newMmdd, setNewMmdd] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [savingFolder, setSavingFolder] = useState(false);

  async function createFolder() {
    if (!selectedCategory || !newMmdd.trim() || !newLabel.trim()) return;
    setSavingFolder(true);
    try {
      const res = await adminFetch("/api/admin/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: Number(brandId),
          category: selectedCategory.slug,
          mmdd: newMmdd.trim(),
          label: newLabel.trim(),
        }),
      });
      setNewMmdd("");
      setNewLabel("");
      setNewFolderOpen(false);
      await loadFolders();
      notify("폴더를 만들었어요 — 바로 사진을 올려보세요");
      if (res.folder) await openFolder(res.folder);
    } catch (e: any) {
      notify(e.message ?? "폴더 생성 실패");
    } finally {
      setSavingFolder(false);
    }
  }

  async function deleteFolder(folder: FolderRow) {
    if (!confirm(`"${folder.folder_name}" 폴더를 삭제할까요?\n안에 있는 사진이 모두 함께 삭제됩니다.`)) return;
    try {
      await adminFetch(`/api/admin/folders/${folder.id}`, { method: "DELETE" });
      if (selectedFolder?.id === folder.id) {
        setSelectedFolder(null);
        setLocationId(null);
        setPhotos([]);
      }
      await loadFolders();
      notify("폴더를 삭제했어요");
    } catch (e: any) {
      notify(e.message ?? "폴더 삭제 실패");
    }
  }

  // ── 사진 업로드/삭제 ──
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // 드래그로 폴더를 통째로 놓으면 그 안의 이미지 파일들을 재귀적으로 모두 찾아냄
  function readEntryAsFiles(entry: any): Promise<File[]> {
    return new Promise((resolve) => {
      if (!entry) return resolve([]);
      if (entry.isFile) {
        entry.file((file: File) => resolve([file]), () => resolve([]));
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const collected: any[] = [];
        const readBatch = () => {
          reader.readEntries(async (batch: any[]) => {
            if (batch.length === 0) {
              const nested = await Promise.all(collected.map(readEntryAsFiles));
              resolve(nested.flat());
            } else {
              collected.push(...batch);
              readBatch();
            }
          }, () => resolve([]));
        };
        readBatch();
      } else {
        resolve([]);
      }
    });
  }

  async function filesFromDrop(dt: DataTransfer): Promise<File[]> {
    const items = Array.from(dt.items || []);
    const entries = items.map((it: any) => it.webkitGetAsEntry?.()).filter(Boolean);
    if (entries.length > 0) {
      const nested = await Promise.all(entries.map(readEntryAsFiles));
      return nested.flat();
    }
    return Array.from(dt.files || []);
  }

  async function uploadFiles(files: FileList | File[]) {
    if (!locationId) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: list.length });
    for (let i = 0; i < list.length; i++) {
      try {
        const form = new FormData();
        form.append("file", list[i]);
        form.append("location_id", locationId);
        await adminFetch("/api/admin/photos", { method: "POST", body: form });
      } catch (e: any) {
        notify(`업로드 실패: ${e.message ?? list[i].name}`);
      }
      setUploadProgress({ done: i + 1, total: list.length });
    }
    setUploading(false);
    setUploadProgress(null);
    await loadPhotos(locationId);
    notify("사진 업로드 완료");
  }

  async function deletePhoto(photo: PhotoRow) {
    if (!confirm("이 사진을 삭제할까요?")) return;
    try {
      await adminFetch(`/api/admin/photos/${photo.id}`, { method: "DELETE" });
      if (locationId) await loadPhotos(locationId);
      notify("사진을 삭제했어요");
    } catch (e: any) {
      notify(e.message ?? "사진 삭제 실패");
    }
  }

  return (
    <div className="relative min-h-screen bg-black px-4 py-10 sm:px-8 sm:py-16">
      <div className="pointer-events-none fixed left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[#deff9a]/[0.04] blur-[140px]" />

      <div className="relative z-10 mb-2 font-mono text-xs font-light tracking-widest text-white/30">
        <Link href="/admin" className="hover:text-[#deff9a] transition-colors">
          ← 전체 프로덕션
        </Link>{" "}
        / BRAND {String(brandId).padStart(2, "0")} / <span className="text-[#deff9a]">ADMIN</span>
      </div>
      <h1 className="relative z-10 mb-8 text-xl font-light tracking-[0.2em] text-white">
        사진 <span className="text-[#deff9a]">관리자</span>
      </h1>

      {/* 카테고리 탭 — 추가/수정/삭제 가능 */}
      <div className="relative z-10 mb-6 flex flex-wrap items-center gap-2">
        {categoriesLoading ? (
          <LoadingRow />
        ) : (
          categories.map((cat) => {
            const active = selectedCategory?.id === cat.id;
            const isEditing = editingCatId === cat.id;
            if (isEditing) {
              return (
                <div
                  key={cat.id}
                  className="flex items-center gap-1 rounded-xl border border-[#deff9a]/40 bg-[#deff9a]/[0.08] px-2 py-1.5"
                >
                  <input
                    value={editingCatName}
                    onChange={(e) => setEditingCatName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEditCategory()}
                    autoFocus
                    className="w-24 bg-transparent text-xs text-[#deff9a] outline-none"
                  />
                  <button onClick={saveEditCategory} className="text-[#deff9a]">
                    <Check size={13} />
                  </button>
                  <button onClick={() => setEditingCatId(null)} className="text-white/40 hover:text-white">
                    <X size={13} />
                  </button>
                </div>
              );
            }
            return (
              <div
                key={cat.id}
                className={`group flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-light tracking-widest transition-all ${
                  active
                    ? "border-[#deff9a]/40 bg-[#deff9a]/[0.08] text-[#deff9a]"
                    : "border-white/10 text-white/50 hover:border-white/20 hover:text-white"
                }`}
              >
                <button onClick={() => setSelectedCategory(cat)}>{cat.name}</button>
                <span className="hidden items-center gap-1 group-hover:flex">
                  <button
                    onClick={() => {
                      setEditingCatId(cat.id);
                      setEditingCatName(cat.name);
                    }}
                    className="text-white/30 hover:text-white"
                  >
                    <Pencil size={11} />
                  </button>
                  <button onClick={() => deleteCategory(cat)} className="text-white/30 hover:text-red-400">
                    <Trash2 size={11} />
                  </button>
                </span>
              </div>
            );
          })
        )}

        {newCatOpen ? (
          <div className="flex items-center gap-1 rounded-xl border border-[#deff9a]/20 bg-[#deff9a]/[0.04] px-2 py-1.5">
            <input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createCategory()}
              placeholder="카테고리 이름"
              autoFocus
              className="w-24 bg-transparent text-xs text-white outline-none placeholder:text-white/30"
            />
            <button onClick={createCategory} disabled={savingCat} className="text-[#deff9a] disabled:opacity-50">
              <Check size={13} />
            </button>
            <button onClick={() => setNewCatOpen(false)} className="text-white/40 hover:text-white">
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setNewCatOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-dashed border-white/15 px-3 py-2.5 text-xs text-white/40 transition-colors hover:border-[#deff9a]/40 hover:text-[#deff9a]"
          >
            <Plus size={13} /> 카테고리
          </button>
        )}
      </div>

      <div className="relative z-10 mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[1fr_1.6fr]">
        {/* 폴더 */}
        <Panel title="폴더" disabled={!selectedCategory}>
          {!selectedCategory ? (
            <EmptyHint text="카테고리를 먼저 만들어보세요" />
          ) : foldersLoading ? (
            <LoadingRow />
          ) : (
            <div className="space-y-2">
              {folders.map((f) => (
                <RowCard
                  key={f.id}
                  active={selectedFolder?.id === f.id}
                  onClick={() => openFolder(f)}
                  onDelete={() => deleteFolder(f)}
                  icon={<Folder size={16} strokeWidth={1.5} />}
                  label={f.folder_name}
                />
              ))}
              {folders.length === 0 && <EmptyHint text="폴더가 없어요" />}

              {newFolderOpen ? (
                <div className="space-y-2 rounded-xl border border-[#deff9a]/20 bg-[#deff9a]/[0.04] p-3">
                  <input
                    value={newMmdd}
                    onChange={(e) => setNewMmdd(e.target.value)}
                    placeholder="날짜 (예: 0925)"
                    maxLength={4}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[#deff9a]/40"
                  />
                  <input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="라벨 (예: 최종제안)"
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[#deff9a]/40"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={createFolder}
                      disabled={savingFolder}
                      className="flex-1 rounded-lg bg-[#deff9a] py-2 text-xs font-medium text-black disabled:opacity-50"
                    >
                      {savingFolder ? "저장 중..." : "만들고 바로 업로드"}
                    </button>
                    <button
                      onClick={() => setNewFolderOpen(false)}
                      className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 hover:text-white"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <AddButton label="새 폴더" onClick={() => setNewFolderOpen(true)} />
              )}
            </div>
          )}
        </Panel>

        {/* 사진 */}
        <Panel title={selectedFolder ? `사진 — ${selectedFolder.folder_name}` : "사진"} disabled={!selectedFolder}>
          {!selectedFolder ? (
            <EmptyHint text="폴더를 클릭하면 바로 사진을 올릴 수 있어요" />
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setDragOver(false);
                const files = await filesFromDrop(e.dataTransfer);
                if (files.length > 0) uploadFiles(files);
              }}
              className={`rounded-xl border-2 border-dashed p-2 transition-colors ${
                dragOver ? "border-[#deff9a]/60 bg-[#deff9a]/[0.04]" : "border-transparent"
              }`}
            >
              {photosLoading ? (
                <LoadingRow />
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {photos.map((p) => (
                    <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={locationPhotoUrl(p.storage_path)} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => deletePhoto(p)}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500/80"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 text-white/40 transition-colors hover:border-[#deff9a]/40 hover:text-[#deff9a] disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span className="text-[10px]">
                          {uploadProgress ? `${uploadProgress.done}/${uploadProgress.total}` : "업로드 중"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload size={18} strokeWidth={1.5} />
                        <span className="text-[10px] tracking-wide">사진 추가</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => folderInputRef.current?.click()}
                    disabled={uploading}
                    className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 text-white/40 transition-colors hover:border-[#deff9a]/40 hover:text-[#deff9a] disabled:opacity-50"
                  >
                    <Folder size={18} strokeWidth={1.5} />
                    <span className="text-[10px] tracking-wide">폴더째 올리기</span>
                  </button>
                </div>
              )}
              {photos.length === 0 && !photosLoading && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/25">
                  <ImageOff size={12} /> 아직 사진이 없어요 — 여기로 드래그하거나 + 를 눌러 올리세요
                </p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) uploadFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <input
                ref={folderInputRef}
                type="file"
                multiple
                className="hidden"
                {...({ webkitdirectory: "true", directory: "true" } as any)}
                onChange={(e) => {
                  if (e.target.files) uploadFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </Panel>
      </div>

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

function Panel({ title, disabled, children }: { title: string; disabled?: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-[#0A0A0A] p-4 ${disabled ? "opacity-60" : ""}`}>
      <div className="mb-3 text-[11px] font-light tracking-[0.2em] text-white/30">{title.toUpperCase()}</div>
      {children}
    </div>
  );
}

function RowCard({
  active,
  onClick,
  onDelete,
  icon,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  onDelete: () => void;
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`group flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-all ${
        active ? "border-[#deff9a]/40 bg-[#deff9a]/[0.06]" : "border-white/10 hover:border-white/20"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {icon && <span className={active ? "text-[#deff9a]" : "text-white/30"}>{icon}</span>}
        <div className={`truncate text-xs font-light ${active ? "text-[#deff9a]" : "text-white/70"}`}>{label}</div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="shrink-0 text-white/15 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-2.5 text-xs text-white/40 transition-colors hover:border-[#deff9a]/40 hover:text-[#deff9a]"
    >
      <Plus size={14} /> {label}
    </button>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="py-4 text-center text-[11px] text-white/20">{text}</p>;
}

function LoadingRow() {
  return (
    <div className="flex items-center justify-center py-6 text-white/20">
      <Loader2 size={16} className="animate-spin" />
    </div>
  );
}
