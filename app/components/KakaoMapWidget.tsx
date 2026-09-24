"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { supabase, locationPhotoUrl } from "../../lib/supabaseClient";
import { parseRound } from "../../lib/parseFolder";

// Kakao Maps JavaScript 키 — 도메인 제한 키라 클라이언트 노출이 안전함 (hocation.netlify.app 로 제한 등록됨)
const KAKAO_JS_KEY = "5abc14a5fd9dcdacbb5802bd0e25dc33";

// ── 공간(집/공장/복도/영화관…) ──
// 고정 목록 없이 DB의 categories에서 가져오고, 핀 색상은 순서대로 팔레트에서 자동 배정.
type Space = { slug: string; name: string; color: string };

const PIN_PALETTE = ["#1a1a1a", "#ef4444", "#16a34a", "#3b82f6", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6"];

function buildSpaces(list: { slug: string; name: string }[]): Space[] {
  return list.map((s, i) => ({ ...s, color: PIN_PALETTE[i % PIN_PALETTE.length] }));
}

function makeColorOf(spaces: Space[]) {
  return (slug: string) => spaces.find((s) => s.slug === slug)?.color ?? PIN_PALETTE[0];
}

// ── 폴더 규칙 ──
// 공간 > 회차 폴더("집1차") > 로케이션 폴더("YYYYMMDD-장소명-주소") > 사진
// 핀 = 로케이션 하나. 핀 속 숫자 = 회차, 색 = 공간, 같은 공간에서 가장 높은 회차의 핀은 크게 강조.
type RawLocation = {
  category: string; // 공간 slug
  round: number | null;
  mmdd: string; // 회차 폴더 날짜 (fallback 용)
  shootDate?: string | null; // 로케이션 폴더 날짜 "YYYY-MM-DD"
  folderLabel: string; // 회차를 못 읽을 때 그대로 보여줄 폴더 라벨
  name: string;
  address: string;
  photos?: string[];
};

type LocationEntry = {
  name: string;
  address: string;
  category: string; // 공간 slug
  round: number | null;
  label: string; // 화면 표시용 — 예: "집1차"
  dateLabel: string; // "09/18"
  isLatest: boolean; // 같은 공간 안에서 가장 최근 회차인지
  photos: string[];
};

const SAMPLE_SPACES = buildSpaces([
  { slug: "home", name: "집" },
  { slug: "factory", name: "공장" },
  { slug: "hallway", name: "복도" },
  { slug: "cinema", name: "영화관" },
]);

const SAMPLE_RAW: RawLocation[] = [
  { category: "home", round: 1, mmdd: "0918", folderLabel: "집1차", name: "왕십리 주택", address: "서울 성동구 왕십리로 115" },
  { category: "home", round: 2, mmdd: "0925", folderLabel: "집2차", name: "연남동 단독주택", address: "서울 마포구 성미산로 100" },
  { category: "factory", round: 1, mmdd: "0918", folderLabel: "공장1차", name: "잠실 창고", address: "서울 송파구 올림픽로 25" },
  { category: "factory", round: 2, mmdd: "0925", folderLabel: "공장2차", name: "고척 공장", address: "서울 구로구 경인로 430" },
  { category: "factory", round: 3, mmdd: "1002", folderLabel: "공장3차", name: "목동 공장", address: "서울 양천구 안양천로 939" },
  { category: "hallway", round: 1, mmdd: "0918", folderLabel: "복도1차", name: "테헤란로 사옥 복도", address: "서울 강남구 테헤란로 152" },
  { category: "cinema", round: 1, mmdd: "0918", folderLabel: "영화관1차", name: "합정 극장", address: "서울 마포구 양화로 133" },
];

// TODO: 사진이 없는 로케이션은 장소명을 시드로 한 고정 샘플 이미지 사용.
function samplePhotos(seed: string): string[] {
  const key = encodeURIComponent(seed);
  return [`https://picsum.photos/seed/${key}-1/400/300`, `https://picsum.photos/seed/${key}-2/400/300`];
}

function toDateLabel(shootDate?: string | null, mmdd?: string): string {
  const d = shootDate?.match(/^\d{4}-(\d{2})-(\d{2})/);
  if (d) return `${d[1]}/${d[2]}`;
  if (mmdd && mmdd.length === 4) return `${mmdd.slice(0, 2)}/${mmdd.slice(2, 4)}`;
  return "";
}

// 회차 비교: 회차 번호 우선, 없으면 날짜(mmdd)
function cmpRank(a: RawLocation, b: RawLocation) {
  return (a.round ?? 0) - (b.round ?? 0) || a.mmdd.localeCompare(b.mmdd);
}

function buildLocations(raw: RawLocation[], spaces: Space[]): LocationEntry[] {
  const nameOf = new Map(spaces.map((s) => [s.slug, s.name]));
  const usable = raw.filter((r) => r.address.trim()); // 주소 없으면 핀을 못 찍음

  const best = new Map<string, RawLocation>();
  usable.forEach((r) => {
    const cur = best.get(r.category);
    if (!cur || cmpRank(r, cur) > 0) best.set(r.category, r);
  });

  return usable.map((r) => ({
    name: r.name,
    address: r.address,
    category: r.category,
    round: r.round,
    label: r.round != null ? `${nameOf.get(r.category) ?? ""}${r.round}차` : r.folderLabel,
    dateLabel: toDateLabel(r.shootDate, r.mmdd),
    isLatest: cmpRank(r, best.get(r.category)!) === 0,
    photos: r.photos && r.photos.length > 0 ? r.photos : samplePhotos(r.name),
  }));
}

type LoadResult = { spaces: Space[]; locations: LocationEntry[] };

const SAMPLE_RESULT: LoadResult = {
  spaces: SAMPLE_SPACES,
  locations: buildLocations(SAMPLE_RAW, SAMPLE_SPACES),
};
const SAMPLE_LOCATIONS = SAMPLE_RESULT.locations;

// Supabase(categories + folders + locations + photos)에서 실제 데이터를 가져오고,
// 연결 안 되어있거나 해당 브랜드에 데이터가 없으면 샘플 데이터로 자연스럽게 폴백.
async function fetchLocations(brandId?: string | number): Promise<LoadResult> {
  if (!supabase || !brandId) return SAMPLE_RESULT;
  try {
    const bid = Number(brandId);

    // round / shoot_date 컬럼 마이그레이션 전이어도 죽지 않도록 구버전 select로 한 번 더 시도
    const query = (withNew: boolean) =>
      supabase!
        .from("locations")
        .select(
          `id,name,address,sort_order${withNew ? ",shoot_date" : ""},` +
            `folders!inner(category,folder_name,mmdd,label,brand_id${withNew ? ",round" : ""}),` +
            `photos(storage_path,sort_order)`
        )
        .eq("folders.brand_id", bid)
        .order("sort_order", { ascending: true });

    let res: any = await query(true);
    if (res.error) res = await query(false);
    const rows: any[] = res.data ?? [];
    if (res.error || rows.length === 0) return SAMPLE_RESULT;

    const { data: cats } = await supabase
      .from("categories")
      .select("slug,name,sort_order")
      .eq("brand_id", bid)
      .order("sort_order", { ascending: true });

    const list: { slug: string; name: string }[] = (cats ?? []).map((c: any) => ({ slug: c.slug, name: c.name }));
    rows.forEach((row) => {
      const slug = row.folders.category as string;
      if (!list.some((c) => c.slug === slug)) list.push({ slug, name: slug });
    });
    const spaces = buildSpaces(list);

    const raw: RawLocation[] = rows.map((row) => {
      const f = row.folders;
      const round: number | null =
        f.round ?? parseRound(f.label ?? "")?.round ?? parseRound(f.folder_name ?? "")?.round ?? null;
      const photoRows = [...(row.photos ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
      return {
        category: f.category,
        round,
        mmdd: f.mmdd ?? "",
        shootDate: row.shoot_date ?? null,
        folderLabel: f.label ?? f.folder_name ?? "",
        name: row.name,
        address: row.address ?? "",
        photos: photoRows.slice(0, 2).map((p: any) => locationPhotoUrl(p.storage_path)),
      };
    });

    return { spaces, locations: buildLocations(raw, spaces) };
  } catch {
    return SAMPLE_RESULT;
  }
}

declare global {
  interface Window {
    kakao: any;
  }
}

type MarkerEntry = {
  marker: any;
  overlay: any;
  category: string;
  map: any;
};

function loadKakaoSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.kakao?.maps) {
      window.kakao.maps.load(() => resolve());
      return;
    }
    const existing = document.getElementById("kakao-map-sdk") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => window.kakao.maps.load(() => resolve()));
      existing.addEventListener("error", () => reject(new Error("kakao sdk load failed")));
      return;
    }
    const script = document.createElement("script");
    script.id = "kakao-map-sdk";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => window.kakao.maps.load(() => resolve());
    script.onerror = () => reject(new Error("kakao sdk load failed"));
    document.head.appendChild(script);
  });
}

// 공간 색상 핀 + 핀 속 회차 숫자. 같은 공간 안에서 가장 최근 회차의 핀은 조금 더 크고 은은한 글로우로 강조.
function pinImageSrc(color: string, isLatest: boolean, round: number | null) {
  const glow = isLatest ? `<circle cx="14" cy="14" r="13" fill="${color}" opacity="0.22"/>` : "";
  const inner =
    round != null
      ? `<circle cx="14" cy="14" r="8.5" fill="white"/><text x="14" y="${round >= 10 ? 17.2 : 18}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${round >= 10 ? 9 : 11}" font-weight="700" fill="${color}">${round}</text>`
      : `<circle cx="14" cy="14" r="5.5" fill="white"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 38">${glow}<path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.3 21.7 0 14 0z" fill="${color}"/>${inner}</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// 마우스오버 시 뜨는 장소명 + 폴더 라벨 말풍선 HTML — 폴더명에 적은 라벨을 그대로 보여줌
function tooltipHtml(loc: LocationEntry) {
  return `<div style="transform:translateY(-6px);padding:4px 9px;border-radius:8px;background:rgba(0,0,0,0.85);color:#deff9a;font-size:11px;white-space:nowrap;font-family:inherit;border:1px solid rgba(222,255,154,0.3);">${loc.name} · ${loc.label}${loc.dateLabel ? ` (${loc.dateLabel})` : ""}</div>`;
}

function renderMarkers(
  map: any,
  locations: LocationEntry[],
  colorOf: (slug: string) => string,
  onDone?: (entries: MarkerEntry[]) => void,
  onSelect?: (loc: LocationEntry | null) => void
) {
  const { kakao } = window;
  const geocoder = new kakao.maps.services.Geocoder();
  const bounds = new kakao.maps.LatLngBounds();
  let done = 0;
  let found = 0;
  const entries: MarkerEntry[] = [];

  // 빈 지도 영역을 클릭하면 선택 해제 (사진 패널 닫기)
  if (onSelect) kakao.maps.event.addListener(map, "click", () => onSelect(null));

  if (locations.length === 0) {
    onDone?.([]);
    return;
  }

  locations.forEach((loc) => {
    geocoder.addressSearch(loc.address, (result: any[], resultStatus: string) => {
      done += 1;
      if (resultStatus === kakao.maps.services.Status.OK && result[0]) {
        const coords = new kakao.maps.LatLng(Number(result[0].y), Number(result[0].x));
        const size = loc.isLatest ? 34 : 26;
        const height = loc.isLatest ? 46 : 35;
        const markerImage = new kakao.maps.MarkerImage(
          pinImageSrc(colorOf(loc.category), loc.isLatest, loc.round),
          new kakao.maps.Size(size, height),
          { offset: new kakao.maps.Point(size / 2, height) }
        );
        const marker = new kakao.maps.Marker({ map, position: coords, title: loc.name, image: markerImage });

        // 마우스오버 시 이름/라벨 툴팁
        const overlay = new kakao.maps.CustomOverlay({
          position: coords,
          content: tooltipHtml(loc),
          yAnchor: loc.isLatest ? 2.3 : 1.9,
          zIndex: 20,
        });
        kakao.maps.event.addListener(marker, "mouseover", () => overlay.setMap(map));
        kakao.maps.event.addListener(marker, "mouseout", () => overlay.setMap(null));
        // 클릭 시 해당 폴더의 사진 미리보기 패널 표시
        if (onSelect) kakao.maps.event.addListener(marker, "click", () => onSelect(loc));

        entries.push({ marker, overlay, category: loc.category, map });
        bounds.extend(coords);
        found += 1;
      }
      if (done === locations.length) {
        if (found > 0) map.setBounds(bounds);
        onDone?.(entries);
      }
    });
  });
}

function CategoryToggleLegend({
  spaces,
  active,
  onToggle,
  showLabel = false,
}: {
  spaces: Space[];
  active: Set<string>;
  onToggle: (slug: string) => void;
  showLabel?: boolean;
}) {
  return (
    <div className="flex max-w-[60vw] flex-wrap items-center justify-end gap-1.5 rounded-md bg-black/70 px-2 py-1.5 backdrop-blur">
      {spaces.map((sp) => {
        const isActive = active.has(sp.slug);
        return (
          <button
            key={sp.slug}
            onClick={() => onToggle(sp.slug)}
            title={`${sp.name} 핀 ${isActive ? "숨기기" : "보이기"}`}
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] tracking-wide transition-all ${
              isActive ? "opacity-100" : "opacity-30"
            }`}
          >
            <span className="h-2.5 w-2.5 rounded-full ring-1 ring-white/30" style={{ backgroundColor: sp.color }} />
            {showLabel && <span className="text-white/70">{sp.name}</span>}
          </button>
        );
      })}
    </div>
  );
}

// 핀 클릭 시 뜨는 사진 미리보기 패널 — 폴더 맨 위 1~2장 + 장소명/라벨
function PhotoPreviewPanel({
  loc,
  onClose,
  compact = false,
}: {
  loc: LocationEntry;
  onClose: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`absolute z-30 rounded-xl border border-white/10 bg-black/85 shadow-2xl shadow-black/60 backdrop-blur-md ${
        compact ? "inset-x-2 bottom-2 p-2.5" : "bottom-4 right-4 w-64 p-3"
      }`}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium text-white">{loc.name}</p>
          <p className="truncate text-[9px] tracking-wide text-[#deff9a]/70">
            {loc.label}
            {loc.dateLabel ? ` · ${loc.dateLabel}` : ""}
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded p-0.5 text-white/40 transition-colors hover:text-[#deff9a]"
          aria-label="닫기"
        >
          <X size={12} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {loc.photos.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`${loc.name} 사진 ${i + 1}`}
            loading="lazy"
            className={`w-full rounded-lg object-cover ${compact ? "h-14" : "h-24"}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function KakaoMapWidget({ brandId }: { brandId?: string | number } = {}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const modalMapRef = useRef<HTMLDivElement>(null);
  const compactEntriesRef = useRef<MarkerEntry[]>([]);
  const modalEntriesRef = useRef<MarkerEntry[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState<Set<string>>(new Set(SAMPLE_SPACES.map((s) => s.slug)));
  const [selected, setSelected] = useState<LocationEntry | null>(null);
  const [locations, setLocations] = useState<LocationEntry[]>(SAMPLE_LOCATIONS);
  const [spaces, setSpaces] = useState<Space[]>(SAMPLE_SPACES);

  function openExpanded(open: boolean) {
    setSelected(null);
    setExpanded(open);
  }

  function toggleCategory(cat: string) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  // 카테고리 on/off를 실제 마커 표시에 반영
  useEffect(() => {
    [...compactEntriesRef.current, ...modalEntriesRef.current].forEach((entry) => {
      const visible = active.has(entry.category);
      entry.marker.setMap(visible ? entry.map : null);
      if (!visible) entry.overlay.setMap(null);
    });
  }, [active]);

  // 작은 위젯 지도 — SDK 로드 + Supabase 데이터 조회를 함께 기다린 뒤 렌더링
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadKakaoSdk(), fetchLocations(brandId)])
      .then(([, loaded]) => {
        if (cancelled || !mapRef.current) return;
        const { spaces: sp, locations: locs } = loaded;
        setSpaces(sp);
        setActive(new Set(sp.map((s) => s.slug)));
        setLocations(locs);
        const { kakao } = window;
        const map = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(37.5665, 126.978),
          level: 8,
        });
        renderMarkers(
          map,
          locs,
          makeColorOf(sp),
          (entries) => {
            if (cancelled) return;
            compactEntriesRef.current = entries;
            setStatus("ready");
          },
          (loc) => setSelected(loc)
        );
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId]);

  // 확대 모달 지도 (열릴 때마다 별도로 초기화)
  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    loadKakaoSdk().then(() => {
      if (cancelled || !modalMapRef.current) return;
      const { kakao } = window;
      const map = new kakao.maps.Map(modalMapRef.current, {
        center: new kakao.maps.LatLng(37.5665, 126.978),
        level: 8,
      });
      renderMarkers(
        map,
        locations,
        makeColorOf(spaces),
        (entries) => {
          if (cancelled) return;
          modalEntriesRef.current = entries;
          // 이미 꺼둔 카테고리는 모달에도 그대로 반영
          entries.forEach((entry) => {
            if (!active.has(entry.category)) entry.marker.setMap(null);
          });
        },
        (loc) => setSelected(loc)
      );
      setTimeout(() => map.relayout(), 60);
    });
    return () => {
      cancelled = true;
      modalEntriesRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  // ESC로 닫기
  useEffect(() => {
    if (!expanded) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  return (
    <>
      <div className="relative h-56 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A]">
        <div ref={mapRef} className="h-full w-full" />
        {status !== "ready" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#0A0A0A] text-xs tracking-widest text-white/20">
            {status === "error" ? "지도를 불러올 수 없습니다" : "KAKAO MAP LOADING..."}
          </div>
        )}
        <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-md bg-black/60 px-2 py-1 text-[9px] tracking-widest text-[#deff9a]/80 backdrop-blur">
          LOCATION SCOUTER
        </div>
        {status === "ready" && (
          <div className="absolute right-3 top-3 z-20 flex flex-col items-end gap-1.5">
            <CategoryToggleLegend spaces={spaces} active={active} onToggle={toggleCategory} />
            <button
              onClick={() => openExpanded(true)}
              className="flex items-center gap-1 rounded-md bg-[#deff9a] px-2.5 py-1.5 text-[10px] font-medium tracking-widest text-black shadow-lg shadow-black/40 transition-transform active:scale-95 hover:bg-[#deff9a]/90"
            >
              <Maximize2 size={12} /> 확대
            </button>
          </div>
        )}
        {selected && !expanded && (
          <PhotoPreviewPanel loc={selected} onClose={() => setSelected(null)} compact />
        )}
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => openExpanded(false)}
        >
          <div
            className="relative h-[90vh] w-[95vw] max-w-7xl overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A]"
            onClick={(e) => e.stopPropagation()}
          >
            <div ref={modalMapRef} className="h-full w-full" />
            <div className="absolute left-4 top-4 z-20">
              <CategoryToggleLegend spaces={spaces} active={active} onToggle={toggleCategory} showLabel />
            </div>
            <div className="pointer-events-none absolute bottom-4 left-4 z-20 rounded-md bg-black/70 px-3 py-1.5 text-[9px] tracking-widest text-white/50 backdrop-blur">
              핀을 클릭하면 사진이 보여요 · 핀 속 숫자 = 회차 · 크고 밝은 핀 = 공간별 가장 최근 회차
            </div>
            {selected && <PhotoPreviewPanel loc={selected} onClose={() => setSelected(null)} />}
            <button
              onClick={() => openExpanded(false)}
              className="absolute right-4 top-4 z-20 flex items-center justify-center rounded-md border border-white/20 bg-black/80 p-2 text-white/80 backdrop-blur transition-colors hover:border-[#deff9a]/50 hover:text-[#deff9a]"
              aria-label="닫기"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
