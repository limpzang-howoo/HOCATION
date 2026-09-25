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
  MapPin,
} from "lucide-react";
import PasswordGate from "../../components/PasswordGate";
import LocationReportCard from "../../components/LocationReportCard";
import { supabase, locationPhotoUrl } from "../../../lib/supabaseClient";
import { ADMIN_TOKEN } from "../../../lib/adminToken";
import { parseLocation } from "../../../lib/parseFolder";
import { REPORT_FIELDS, ReportData } from "../../../lib/reportFields";

type CategoryRow = { id: string; slug: string; name: string; sort_order: number };
type FolderRow = { id: string; category: string; folder_name: string; mmdd: string; label: string; round: number | null };
type LocationRow = { id: string; name: string; address: string; shoot_date: string | null; report: ReportData | null };
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

  // ── 카테고리(공간) ──
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
    if (!confirm(`"${cat.name}" 카테고리를 삭제할까요?\n안의 폴더·장소·사진이 모두 함께 삭제됩니다.`)) return;
    try {
      await adminFetch(`/api/admin/categories/${cat.id}`, { method: "DELETE" });
      if (selectedCategory?.id === cat.id) setSelectedCategory(null);
      await loadCategories();
      notify("카테고리를 삭제했어요");
    } catch (e: any) {
      notify(e.message ?? "카테고리 삭제 실패");
    }
  }

  // ── 폴더(회차) ──
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FolderRow | null>(null);

  const loadFolders = useCallback(async () => {
    if (!supabase || !selectedCategory) {
      setFolders([]);
      return;
    }
    setFoldersLoading(true);
    const { data } = await supabase
      .from("folders")
      .select("id,category,folder_name,mmdd,label,round")
      .eq("brand_id", Number(brandId))
      .eq("category", selectedCategory.slug)
      .order("mmdd", { ascending: false });
    setFolders(data ?? []);
    setFoldersLoading(false);
  }, [brandId, selectedCategory]);

  // ── 장소(로케이션) — 폴더 하나 안에 여러 개 있을 수 있음 ──
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationRow | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);

  const loadLocations = useCallback(async (folderId: string) => {
    if (!supabase) return;
    setLocationsLoading(true);
    const { data } = await supabase
      .from("locations")
      .select("id,name,address,shoot_date,report,sort_order")
      .eq("folder_id", folderId)
      .order("sort_order", { ascending: true });
    setLocations(data ?? []);
    setLocationsLoading(false);
  }, []);

  useEffect(() => {
    setSelectedFolder(null);
    setSelectedLocation(null);
    setLocations([]);
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

  function openFolder(folder: FolderRow) {
    setSelectedFolder(folder);
    setSelectedLocation(null);
    setPhotos([]);
    setLocations([]);
    loadLocations(folder.id);
  }

  async function openLocation(loc: LocationRow) {
    setSelectedLocation(loc);
    setReportDraft(loc.report ?? {});
    setEditingAddress(false);
    setPhotosLoading(true);
    await loadPhotos(loc.id);
    setPhotosLoading(false);
  }

  // 주소(지도 핀 위치) 수정 — 이제 장소 단위
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState("");

  async function saveAddress() {
    if (!selectedLocation) return;
    try {
      await adminFetch(`/api/admin/locations/${selectedLocation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addressDraft.trim() }),
      });
      setSelectedLocation((prev) => (prev ? { ...prev, address: addressDraft.trim() } : prev));
      setEditingAddress(false);
      notify("주소를 저장했어요 — 지도에 반영돼요");
    } catch (e: any) {
      notify(e.message ?? "주소 저장 실패");
    }
  }

  // ── 현장 리포트(한 장 요약) ──
  const [reportDraft, setReportDraft] = useState<ReportData>({});
  const [savingReport, setSavingReport] = useState(false);

  async function saveReport() {
    if (!selectedLocation) return;
    setSavingReport(true);
    try {
      await adminFetch(`/api/admin/locations/${selectedLocation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: reportDraft }),
      });
      setSelectedLocation((prev) => (prev ? { ...prev, report: reportDraft } : prev));
      notify("리포트를 저장했어요");
    } catch (e: any) {
      notify(e.message ?? "리포트 저장 실패");
    } finally {
      setSavingReport(false);
    }
  }

  // ── 새 폴더(회차) ──
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
      notify("폴더를 만들었어요 — 이제 안에 장소를 추가하세요");
      if (res.folder) openFolder(res.folder);
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
        setLocations([]);
        setPhotos([]);
      }
      await loadFolders();
      notify("폴더를 삭제했어요");
    } catch (e: any) {
      notify(e.message ?? "폴더 삭제 실패");
    }
  }

  // ── 새 장소 ──
  const [newLocOpen, setNewLocOpen] = useState(false);
  const [newLocRaw, setNewLocRaw] = useState("");
  const [newLocName, setNewLocName] = useState("");
  const [newLocAddress, setNewLocAddress] = useState("");
  const [savingLoc, setSavingLoc] = useState(false);

  function applyRawParse() {
    const parsed = parseLocation(newLocRaw.trim());
    if (parsed) {
      setNewLocName(parsed.place);
      setNewLocAddress(parsed.address);
    }
  }

  async function createLocation() {
    if (!selectedFolder) return;
    const parsed = parseLocation(newLocRaw.trim());
    const name = (parsed?.place ?? newLocName).trim();
    const address = (parsed?.address ?? newLocAddress).trim();
    const shoot_date = parsed?.date;
    if (!name) return;
    setSavingLoc(true);
    try {
      const res = await adminFetch("/api/admin/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: selectedFolder.id, name, address, shoot_date }),
      });
      setNewLocRaw("");
      setNewLocName("");
      setNewLocAddress("");
      setNewLocOpen(false);
      await loadLocations(selectedFolder.id);
      notify("장소를 추가했어요");
      if (res.location) openLocation(res.location);
    } catch (e: any) {
      notify(e.message ?? "장소 추가 실패");
    } finally {
      setSavingLoc(false);
    }
  }

  async function deleteLocation(loc: LocationRow) {
    if (!confirm(`"${loc.name}" 장소를 삭제할까요?\n안의 사진이 모두 함께 삭제됩니다.`)) return;
    try {
      await adminFetch(`/api/admin/locations/${loc.id}`, { method: "DELETE" });
      if (selectedLocation?.id === loc.id) {
        setSelectedLocation(null);
        setPhotos([]);
      }
      if (selectedFolder) await loadLocations(selectedFolder.id);
      notify("장소를 삭제했어요");
    } catch (e: any) {
      notify(e.message ?? "장소 삭제 실패");
    }
  }

  // ── 폴더째 올리기(자동 인식) — 회차 폴더를 통째로 선택하면 하위 폴더(날짜-장소명-주소)를 각각 장소로 자동 생성 ──
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  async function bulkUploadLocations(fileList: FileList) {
    if (!selectedFolder) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) {
      notify("이미지 파일을 찾지 못했어요");
      return;
    }
    const groups = new Map<string, File[]>();
    files.forEach((f) => {
      const rel = (f as any).webkitRelativePath || f.name;
      const parts = String(rel).split("/");
      const key = parts.length >= 2 ? parts[parts.length - 2] : "미분류";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(f);
    });

    setBulkUploading(true);
    setBulkProgress({ done: 0, total: groups.size });
    let done = 0;
    let createdCount = 0;
    for (const [folderName, groupFiles] of Array.from(groups.entries())) {
      const parsed = parseLocation(folderName);
      const name = parsed?.place ?? folderName;
      const address = parsed?.address ?? "";
      const shoot_date = parsed?.date;
      try {
        const res = await adminFetch("/api/admin/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder_id: selectedFolder.id, name, address, shoot_date }),
        });
        const locId = res.location?.id;
        if (locId) {
          for (const file of groupFiles) {
            try {
              const form = new FormData();
              form.append("file", file);
              form.append("location_id", locId);
              await adminFetch("/api/admin/photos", { method: "POST", body: form });
            } catch {
              // 개별 사진 실패는 건너뛰고 계속 진행
            }
          }
          createdCount++;
        }
      } catch (e: any) {
        notify(`"${folderName}" 처리 실패: ${e.message ?? ""}`);
      }
      done++;
      setBulkProgress({ done, total: groups.size });
    }
    setBulkUploading(false);
    setBulkProgress(null);
    await loadLocations(selectedFolder.id);
    notify(`${createdCount}개 장소를 만들고 사진을 올렸어요`);
  }

  // ── 사진 업로드/삭제(선택된 장소 기준) ──
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

      <div className="relative z-10 mb-2 font-mono text-xs font-light tracking-widest text-white/30">
        <Link href="/admin" className="hover:text-[#deff9a] transition-colors">
          ← 전체 프로덕션
        </Link>{" "}
        / BRAND {String(brandId).padStart(2, "0")} / <span className="text-[#deff9a]">ADMIN</span>
      </div>
      <h1 className="relative z-10 mb-8 text-xl font-light tracking-[0.2em] text-white">
        사진 <span className="text-[#deff9a]">관리자</span>
      </h1>

      {/* 카테고리(공간) 탭 — 추가/수정/삭제 가능 */}
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

      <div className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 폴더(회차) */}
        <Panel title="폴더(회차)" disabled={!selectedCategory}>
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
                    placeholder="라벨 (예: 1차, 최종제안)"
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[#deff9a]/40"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={createFolder}
                      disabled={savingFolder}
                      className="flex-1 rounded-lg bg-[#deff9a] py-2 text-xs font-medium text-black disabled:opacity-50"
                    >
                      {savingFolder ? "저장 중..." : "폴더 만들기"}
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

        {/* 장소(로케이션) */}
        <Panel title={selectedFolder ? `장소 — ${selectedFolder.folder_name}` : "장소"} disabled={!selectedFolder}>
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
                  icon={<MapPin size={16} strokeWidth={1.5} />}
                  label={loc.name}
                />
              ))}
              {locations.length === 0 && <EmptyHint text="아직 장소가 없어요" />}

              {newLocOpen ? (
                <div className="space-y-2 rounded-xl border border-[#deff9a]/20 bg-[#deff9a]/[0.04] p-3">
                  <input
                    value={newLocRaw}
                    onChange={(e) => setNewLocRaw(e.target.value)}
                    onBlur={applyRawParse}
                    placeholder="폴더명 붙여넣기 (날짜-장소명-주소)"
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[#deff9a]/40 placeholder:text-white/25"
                  />
                  <div className="text-center text-[10px] text-white/20">또는 직접 입력</div>
                  <input
                    value={newLocName}
                    onChange={(e) => setNewLocName(e.target.value)}
                    placeholder="장소명"
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[#deff9a]/40"
                  />
                  <input
                    value={newLocAddress}
                    onChange={(e) => setNewLocAddress(e.target.value)}
                    placeholder="주소 (지도 핀 위치)"
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[#deff9a]/40"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={createLocation}
                      disabled={savingLoc}
                      className="flex-1 rounded-lg bg-[#deff9a] py-2 text-xs font-medium text-black disabled:opacity-50"
                    >
                      {savingLoc ? "저장 중..." : "장소 추가"}
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

              <button
                onClick={() => bulkInputRef.current?.click()}
                disabled={bulkUploading}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-2.5 text-xs text-white/40 transition-colors hover:border-[#deff9a]/40 hover:text-[#deff9a] disabled:opacity-50"
              >
                {bulkUploading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    {bulkProgress ? `${bulkProgress.done}/${bulkProgress.total} 장소 처리 중...` : "처리 중..."}
                  </>
                ) : (
                  <>
                    <Folder size={13} /> 장소 폴더들 한번에 올리기
                  </>
                )}
              </button>
              <p className="text-center text-[10px] leading-relaxed text-white/20">
                회차 폴더를 통째로 선택하면 하위 폴더(날짜-장소명-주소)를 각각 장소로 자동 생성해요
              </p>
              <input
                ref={bulkInputRef}
                type="file"
                multiple
                className="hidden"
                {...({ webkitdirectory: "true", directory: "true" } as any)}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) bulkUploadLocations(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </Panel>

        {/* 사진 */}
        <Panel title={selectedLocation ? `사진 — ${selectedLocation.name}` : "사진"} disabled={!selectedLocation}>
          {!selectedLocation ? (
            <EmptyHint text="장소를 클릭하면 바로 사진을 올릴 수 있어요" />
          ) : (
            <>
              <div className="mb-3 flex items-center gap-1.5 text-[11px] text-white/30">
                <MapPin size={12} className="shrink-0 text-white/20" />
                {editingAddress ? (
                  <>
                    <input
                      value={addressDraft}
                      onChange={(e) => setAddressDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveAddress()}
                      placeholder="지도에 표시할 주소"
                      autoFocus
                      className="flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white outline-none focus:border-[#deff9a]/40"
                    />
                    <button onClick={saveAddress} className="text-[#deff9a]">
                      <Check size={12} />
                    </button>
                    <button onClick={() => setEditingAddress(false)} className="text-white/40 hover:text-white">
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className={selectedLocation.address ? "text-white/50" : "text-white/20"}>
                      {selectedLocation.address || "주소 없음 — 지도에 핀이 표시되지 않아요"}
                    </span>
                    <button
                      onClick={() => {
                        setAddressDraft(selectedLocation.address || "");
                        setEditingAddress(true);
                      }}
                      className="text-white/20 hover:text-white"
                    >
                      <Pencil size={11} />
                    </button>
                  </>
                )}
              </div>
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
            </>
          )}
        </Panel>
      </div>

      {/* 현장 정보(리포트) — 장소를 선택했을 때만 */}
      {selectedLocation && (
        <div className="relative z-10 mx-auto mt-6 max-w-6xl">
          <Panel title={`현장 정보 — ${selectedLocation.name}`}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                {REPORT_FIELDS.map((f) => (
                  <div key={f.key}>
                    <label className="mb-1 block text-[10px] tracking-widest text-white/30">{f.label}</label>
                    <input
                      value={reportDraft[f.key] ?? ""}
                      onChange={(e) => setReportDraft((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-[#deff9a]/40 placeholder:text-white/15"
                    />
                  </div>
                ))}
                <button
                  onClick={saveReport}
                  disabled={savingReport}
                  className="mt-2 w-full rounded-lg bg-[#deff9a] py-2 text-xs font-medium text-black disabled:opacity-50"
                >
                  {savingReport ? "저장 중..." : "리포트 저장"}
                </button>
              </div>
              <div>
                <div className="mb-2 text-[10px] tracking-widest text-white/25">미리보기</div>
                <LocationReportCard
                  name={selectedLocation.name}
                  address={selectedLocation.address}
                  shootDate={selectedLocation.shoot_date}
                  report={reportDraft}
                />
              </div>
            </div>
          </Panel>
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
