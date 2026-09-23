"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Home,
  Coffee,
  Trees,
  Folder,
  Plus,
  Trash2,
  X,
  Upload,
  Loader2,
  ImageOff,
} from "lucide-react";
import PasswordGate from "../../components/PasswordGate";
import { supabase, locationPhotoUrl } from "../../../lib/supabaseClient";
import { ADMIN_TOKEN } from "../../../lib/adminToken";

type Category = "home" | "cafe" | "playground";

const CATEGORIES: { slug: Category; name: string; icon: typeof Home }[] = [
  { slug: "home", name: "집 공간", icon: Home },
  { slug: "cafe", name: "카페 공간", icon: Coffee },
  { slug: "playground", name: "운동장 공간", icon: Trees },
];

type FolderRow = { id: string; category: Category; folder_name: string; mmdd: string; label: string };
type LocationRow = { id: string; folder_id: string; name: string; address: string; sort_order: number };
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
    <PasswordGate
      storageKey={`looka_admin_auth_${id}`}
      correctPassword="9284"
      title="ADMIN"
      subtitle="관리자 전용 페이지"
    >
      <AdminContent brandId={id} />
    </PasswordGate>
  );
}

function AdminContent({ brandId }: { brandId: string }) {
  const [category, setCategory] = useState<Category>("home");
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);

  const [selectedFolder, setSelectedFolder] = useState<FolderRow | null>(null);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState<LocationRow | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  function notify(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const loadFolders = useCallback(async () => {
    if (!supabase) return;
    setFoldersLoading(true);
    const { data } = await supabase
      .from("folders")
      .select("id,category,folder_name,mmdd,label")
      .eq("brand_id", Number(brandId))
      .eq("category", category)
      .order("mmdd", { ascending: false });
    setFolders(data ?? []);
    setFoldersLoading(false);
  }, [brandId, category]);

  const loadLocations = useCallback(async (folderId: string) => {
    if (!supabase) return;
    setLocationsLoading(true);
    const { data } = await supabase
      .from("locations")
      .select("id,folder_id,name,address,sort_order")
      .eq("folder_id", folderId)
      .order("sort_order", { ascending: true });
    setLocations(data ?? []);
    setLocationsLoading(false);
  }, []);

  const loadPhotos = useCallback(async (locationId: string) => {
    if (!supabase) return;
    setPhotosLoading(true);
    const { data } = await supabase
      .from("photos")
      .select("id,storage_path,sort_order")
      .eq("location_id", locationId)
      .order("sort_order", { ascending: true });
    setPhotos(data ?? []);
    setPhotosLoading(false);
  }, []);

  useEffect(() => {
    setSelectedFolder(null);
    setSelectedLocation(null);
    loadFolders();
  }, [loadFolders]);

  function openFolder(folder: FolderRow) {
    setSelectedFolder(folder);
    setSelectedLocation(null);
    loadLocations(folder.id);
  }

  function openLocation(loc: LocationRow) {
    setSelectedLocation(loc);
    loadPhotos(loc.id);
  }

  // ── 새 폴더 ──
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newMmdd, setNewMmdd] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [savingFolder, setSavingFolder] = useState(false);

  async function createFolder() {
    if (!newMmdd.trim() || !newLabel.trim()) return;
    setSavingFolder(true);
    try {
      await adminFetch("/api/admin/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_id: Number(brandId), category, mmdd: newMmdd.trim(), label: newLabel.trim() }),
      });
      setNewMmdd("");
      setNewLabel("");
      setNewFolderOpen(false);
      await loadFolders();
      notify("폴더를 만들었어요");
    } catch (e: any) {
      notify(e.message ?? "폴더 생성 실패");
    } finally {
      setSavingFolder(false);
    }
  }

  async function deleteFolder(folder: FolderRow) {
    if (!confirm(`"${folder.folder_name}" 폴더를 삭제할까요?\n안에 있는 장소와 사진이 모두 함께 삭제됩니다.`)) return;
    try {
      await adminFetch(`/api/admin/folders/${folder.id}`, { method: "DELETE" });
      if (selectedFolder?.id === folder.id) {
        setSelectedFolder(null);
        setSelectedLocation(null);
      }
      await loadFolders();
      notify("폴더를 삭제했어요");
    } catch (e: any) {
      notify(e.message ?? "폴더 삭제 실패");
    }
  }

  // ── 새 장소 ──
  const [newLocOpen, setNewLocOpen] = useState(false);
  const [newLocName, setNewLocName] = useState("");
  const [newLocAddress, setNewLocAddress] = useState("");
  const [savingLoc, setSavingLoc] = useState(false);

  async function createLocation() {
    if (!selectedFolder || !newLocName.trim() || !newLocAddress.trim()) return;
    setSavingLoc(true);
    try {
      await adminFetch("/api/admin/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: selectedFolder.id, name: newLocName.trim(), address: newLocAddress.trim() }),
      });
      setNewLocName("");
      setNewLocAddress("");
      setNewLocOpen(false);
      await loadLocations(selectedFolder.id);
      notify("장소를 추가했어요");
    } catch (e: any) {
      notify(e.message ?? "장소 추가 실패");
    } finally {
      setSavingLoc(false);
    }
  }

  async function deleteLocation(loc: LocationRow) {
    if (!confirm(`"${loc.name}"을(를) 삭제할까요?\n등록된 사진도 함께 삭제됩니다.`)) return;
    try {
      await adminFetch(`/api/admin/locations/${loc.id}`, { method: "DELETE" });
      if (selectedLocation?.id === loc.id) setSelectedLocation(null);
      if (selectedFolder) await loadLocations(selectedFolder.id);
      notify("장소를 삭제했어요");
    } catch (e: any) {
      notify(e.message ?? "장소 삭제 실패");
    }
  }

  // ── 사진 업로드/삭제 ──
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList | File[]) {
    if (!selectedLocation) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: list.length });
    for (let i = 0; i < list.length; i++) {
      try {
        const form = new FormData();
        form.append("file", list[i]);
        form.append("location_id", selectedLocation.id);
        await adminFetch("/api/admin/photos", { method: "POST", body: form });
      } catch (e: any) {
        notify(`업로드 실패: ${e.message ?? list[i].name}`);
      }
      setUploadProgress({ done: i + 1, total: list.length });
    }
    setUploading(false);
    setUploadProgress(null);
    await loadPhotos(selectedLocation.id);
    notify("사진 업로드 완료");
  }

  async function deletePhoto(photo: PhotoRow) {
    if (!confirm("이 사진을 삭제할까요?")) return;
    try {
      await adminFetch(`/api/admin/photos/${photo.id}`, { method: "DELETE" });
      if (selectedLocation) await loadPhotos(selectedLocation.id);
      notify("사진을 삭제했어요");
    } catch (e: any) {
      notify(e.message ?? "사진 삭제 실패");
    }
  }

  return (
    <div className="relative min-h-screen bg-black px-4 py-10 sm:px-8 sm:py-16">
      <div className="pointer-events-none fixed left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[#deff9a]/[0.04] blur-[140px]" />

      {/* 브레드크럼 */}
      <div className="relative z-10 mb-2 font-mono text-xs font-light tracking-widest text-white/30">
        <Link href="/" className="hover:text-[#deff9a] transition-colors">
          ARCHIVE
        </Link>{" "}
        / BRAND {String(brandId).padStart(2, "0")} / <span className="text-[#deff9a]">ADMIN</span>
      </div>
      <h1 className="relative z-10 mb-8 text-xl font-light tracking-[0.2em] text-white">
        사진 <span className="text-[#deff9a]">관리자</span>
      </h1>

      {/* 카테고리 탭 */}
      <div className="relative z-10 mb-6 flex gap-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const active = cat.slug === category;
          return (
            <button
              key={cat.slug}
              onClick={() => setCategory(cat.slug)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-light tracking-widest transition-all ${
                active
                  ? "border-[#deff9a]/40 bg-[#deff9a]/[0.08] text-[#deff9a]"
                  : "border-white/10 text-white/50 hover:border-white/20 hover:text-white"
              }`}
            >
              <Icon size={14} strokeWidth={1.5} />
              {cat.name}
            </button>
          );
        })}
      </div>

      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 1열: 폴더 */}
        <Panel title="폴더">
          {foldersLoading ? (
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
                      {savingFolder ? "저장 중..." : "만들기"}
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

        {/* 2열: 장소 */}
        <Panel title="장소" disabled={!selectedFolder}>
          {!selectedFolder ? (
            <EmptyHint text="폴더를 먼저 선택하세요" />
          ) : locationsLoading ? (
            <LoadingRow />
          ) : (
            <div className="space-y-2">
              {locations.map((loc) => (
                <RowCard
                  key={loc.id}
                  active={selectedLocation?.id === loc.id}
                  onClick={() => openLocation(loc)}
                  onDelete={() => deleteLocation(loc)}
                  label={loc.name}
                  sublabel={loc.address}
                />
              ))}
              {locations.length === 0 && <EmptyHint text="장소가 없어요" />}

              {newLocOpen ? (
                <div className="space-y-2 rounded-xl border border-[#deff9a]/20 bg-[#deff9a]/[0.04] p-3">
                  <input
                    value={newLocName}
                    onChange={(e) => setNewLocName(e.target.value)}
                    placeholder="장소 이름"
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[#deff9a]/40"
                  />
                  <input
                    value={newLocAddress}
                    onChange={(e) => setNewLocAddress(e.target.value)}
                    placeholder="주소"
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[#deff9a]/40"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={createLocation}
                      disabled={savingLoc}
                      className="flex-1 rounded-lg bg-[#deff9a] py-2 text-xs font-medium text-black disabled:opacity-50"
                    >
                      {savingLoc ? "저장 중..." : "추가하기"}
                    </button>
                    <button
                      onClick={() => setNewLocOpen(false)}
                      className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 hover:text-white"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <AddButton label="새 장소" onClick={() => setNewLocOpen(true)} />
              )}
            </div>
          )}
        </Panel>

        {/* 3열: 사진 */}
        <Panel title="사진" disabled={!selectedLocation}>
          {!selectedLocation ? (
            <EmptyHint text="장소를 먼저 선택하세요" />
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
              }}
              className={`rounded-xl border-2 border-dashed p-2 transition-colors ${
                dragOver ? "border-[#deff9a]/60 bg-[#deff9a]/[0.04]" : "border-transparent"
              }`}
            >
              {photosLoading ? (
                <LoadingRow />
              ) : (
                <div className="grid grid-cols-3 gap-2">
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
  sublabel,
}: {
  active?: boolean;
  onClick: () => void;
  onDelete: () => void;
  icon?: React.ReactNode;
  label: string;
  sublabel?: string;
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
        <div className="min-w-0">
          <div className={`truncate text-xs font-light ${active ? "text-[#deff9a]" : "text-white/70"}`}>{label}</div>
          {sublabel && <div className="truncate text-[10px] text-white/25">{sublabel}</div>}
        </div>
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
