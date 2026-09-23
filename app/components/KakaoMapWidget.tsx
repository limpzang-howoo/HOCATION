"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { supabase, locationPhotoUrl } from "../../lib/supabaseClient";

// Kakao Maps JavaScript 키 — 도메인 제한 키라 클라이언트 노출이 안전함 (hocation.netlify.app 로 제한 등록됨)
const KAKAO_JS_KEY = "5abc14a5fd9dcdacbb5802bd0e25dc33";

type LocationCategory = "home" | "cafe" | "playground";

const CATEGORY_LABELS: Record<LocationCategory, string> = {
  home: "집",
  cafe: "카페",
  playground: "운동장",
};

// 공간 카테고리별 핀 색상
const CATEGORY_COLORS: Record<LocationCategory, string> = {
  home: "#1a1a1a", // 집 공간 — 검정
  cafe: "#ef4444", // 카페 공간 — 빨강
  playground: "#16a34a", // 운동장 공간 — 초록
};

const ALL_CATEGORIES: LocationCategory[] = ["home", "cafe", "playground"];

// ── 폴더명으로 자료 회차 자동 인식 ──
// 업로드 규칙: "MMDD_라벨" (예: 0918_1차물색, 0925_2차압축, 1002_최종픽). "라벨" 부분은
// 폴더에 적은 텍스트를 그대로 지도에 보여줌 — 회차 번호는 따로 매기지 않음.
// 다만 날짜는 같은 카테고리 안에서 어떤 폴더가 가장 최근 것인지 가려내는 데만 쓰임(핀 강조용).
type RawLocation = {
  category: LocationCategory;
  folderName: string; // 예: "0918_1차물색"
  name: string;
  address: string;
};

// TODO: 실제로는 Supabase에 업로드된 폴더 목록을 그대로 이 형태로 넣으면 됨.
// 지금은 구조/디자인 단계라 "MMDD_라벨" 규칙을 그대로 샘플로 재현. 라벨은 사용자가 원하는 대로 자유롭게 적으면 됨.
const RAW_LOCATIONS: RawLocation[] = [
  { category: "home", folderName: "0918_초기물색", name: "테헤란로 사옥", address: "서울 강남구 테헤란로 152" },
  { category: "home", folderName: "0918_초기물색", name: "왕십리 주택", address: "서울 성동구 왕십리로 115" },
  { category: "home", folderName: "0925_최종제안", name: "연남동 단독주택", address: "서울 마포구 성미산로 100" },
  { category: "cafe", folderName: "0918_후보리스트", name: "합정 카페", address: "서울 마포구 양화로 133" },
  { category: "playground", folderName: "0918_1차물색", name: "잠실 운동장", address: "서울 송파구 올림픽로 25" },
  { category: "playground", folderName: "0925_2차압축", name: "고척 운동장", address: "서울 구로구 경인로 430" },
  { category: "playground", folderName: "1002_최종픽", name: "목동 운동장", address: "서울 양천구 안양천로 939" },
];

type LocationEntry = {
  name: string;
  address: string;
  category: LocationCategory;
  label: string; // 폴더명에서 따온 라벨 (예: "1차물색") — 화면에 그대로 표시
  dateLabel: string; // "09/18"
  isLatest: boolean; // 같은 카테고리 안에서 가장 최근 폴더인지
  photos: string[]; // 폴더 맨 위 사진 1~2장 (지금은 샘플 이미지, 나중에 실제 업로드 사진으로 교체)
};

// TODO: 실제로는 각 폴더에 업로드된 사진 중 맨 위 1~2장의 실제 URL로 교체.
// 지금은 구조/디자인 단계라 장소명을 시드로 한 고정 샘플 이미지를 사용.
function samplePhotos(seed: string): string[] {
  const key = encodeURIComponent(seed);
  return [`https://picsum.photos/seed/${key}-1/400/300`, `https://picsum.photos/seed/${key}-2/400/300`];
}

function parseFolderName(folderName: string): { mmdd: string; label: string } | null {
  const m = folderName.match(/^(\d{4})_(.+)$/); // MMDD_라벨
  if (!m) return null;
  return { mmdd: m[1], label: m[2] };
}

// 폴더명 규칙(MMDD_라벨)에서 라벨은 그대로 쓰고, 날짜는 "최신 폴더" 판별에만 사용
function buildLocations(raw: RawLocation[]): LocationEntry[] {
  const byCategory: Record<LocationCategory, RawLocation[]> = { home: [], cafe: [], playground: [] };
  raw.forEach((r) => byCategory[r.category].push(r));

  const result: LocationEntry[] = [];

  (Object.keys(byCategory) as LocationCategory[]).forEach((cat) => {
    const items = byCategory[cat];
    const latestMmdd = items.reduce((max, r) => {
      const mmdd = parseFolderName(r.folderName)?.mmdd ?? "0000";
      return mmdd > max ? mmdd : max;
    }, "0000");

    items.forEach((r) => {
      const parsed = parseFolderName(r.folderName);
      const mmdd = parsed?.mmdd ?? "0000";
      const dateLabel = mmdd.length === 4 ? `${mmdd.slice(0, 2)}/${mmdd.slice(2, 4)}` : mmdd;
      result.push({
        name: r.name,
        address: r.address,
        category: r.category,
        label: parsed?.label ?? r.folderName,
        dateLabel,
        isLatest: mmdd === latestMmdd,
        photos: samplePhotos(r.name),
      });
    });
  });

  return result;
}

const SAMPLE_LOCATIONS: LocationEntry[] = buildLocations(RAW_LOCATIONS);

// Supabase(folders + locations + photos)에서 실제 데이터를 가져오고,
// 연결 안 되어있거나 해당 브랜드에 데이터가 없으면 샘플 데이터로 자연스럽게 폴백.
async function fetchLocations(brandId?: string | number): Promise<LocationEntry[]> {
  if (!supabase || !brandId) return SAMPLE_LOCATIONS;
  try {
    const { data, error } = await supabase
      .from("locations")
      .select("id,name,address,sort_order,folders!inner(category,mmdd,label,brand_id),photos(storage_path,sort_order)")
      .eq("folders.brand_id", Number(brandId))
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) return SAMPLE_LOCATIONS;

    const latestByCategory = new Map<LocationCategory, string>();
    data.forEach((row: any) => {
      const cat = row.folders.category as LocationCategory;
      const mmdd = row.folders.mmdd as string;
      if (!latestByCategory.has(cat) || mmdd > latestByCategory.get(cat)!) latestByCategory.set(cat, mmdd);
    });

    return data.map((row: any): LocationEntry => {
      const cat = row.folders.category as LocationCategory;
      const mmdd = row.folders.mmdd as string;
      const dateLabel = mmdd.length === 4 ? `${mmdd.slice(0, 2)}/${mmdd.slice(2, 4)}` : mmdd;
      const photoRows = [...(row.photos ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
      const photos = photoRows.length > 0 ? photoRows.map((p: any) => locationPhotoUrl(p.storage_path)) : samplePhotos(row.name);
      return {
        name: row.name,
        address: row.address,
        category: cat,
        label: row.folders.label,
        dateLabel,
        isLatest: mmdd === latestByCategory.get(cat),
        photos,
      };
    });
  } catch {
    return SAMPLE_LOCATIONS;
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
  category: LocationCategory;
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

// 카테고리 색상 핀. 같은 공간 안에서 가장 최근 폴더의 핀은 조금 더 크고 은은한 글로우로 강조.
function pinImageSrc(color: string, isLatest: boolean) {
  const glow = isLatest ? `<circle cx="14" cy="14" r="13" fill="${color}" opacity="0.22"/>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 38">${glow}<path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.3 21.7 0 14 0z" fill="${color}"/><circle cx="14" cy="14" r="5.5" fill="white"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// 마우스오버 시 뜨는 장소명 + 폴더 라벨 말풍선 HTML — 폴더명에 적은 라벨을 그대로 보여줌
function tooltipHtml(loc: LocationEntry) {
  return `<div style="transform:translateY(-6px);padding:4px 9px;border-radius:8px;background:rgba(0,0,0,0.85);color:#deff9a;font-size:11px;white-space:nowrap;font-family:inherit;border:1px solid rgba(222,255,154,0.3);">${loc.name} · ${loc.label} (${loc.dateLabel})</div>`;
}

function renderMarkers(
  map: any,
  locations: LocationEntry[],
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

  locations.forEach((loc) => {
    geocoder.addressSearch(loc.address, (result: any[], resultStatus: string) => {
      done += 1;
      if (resultStatus === kakao.maps.services.Status.OK && result[0]) {
        const coords = new kakao.maps.LatLng(Number(result[0].y), Number(result[0].x));
        const size = loc.isLatest ? 34 : 26;
        const height = loc.isLatest ? 46 : 35;
        const markerImage = new kakao.maps.MarkerImage(
          pinImageSrc(CATEGORY_COLORS[loc.category], loc.isLatest),
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
  active,
  onToggle,
  showLabel = false,
}: {
  active: Set<LocationCategory>;
  onToggle: (cat: LocationCategory) => void;
  showLabel?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1.5 backdrop-blur">
      {ALL_CATEGORIES.map((cat) => {
        const isActive = active.has(cat);
        return (
          <button
            key={cat}
            onClick={() => onToggle(cat)}
            title={`${CATEGORY_LABELS[cat]} 핀 ${isActive ? "숨기기" : "보이기"}`}
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] tracking-wide transition-all ${
              isActive ? "opacity-100" : "opacity-30"
            }`}
          >
            <span
              className="h-2.5 w-2.5 rounded-full ring-1 ring-white/30"
              style={{ backgroundColor: CATEGORY_COLORS[cat] }}
            />
            {showLabel && <span className="text-white/70">{CATEGORY_LABELS[cat]}</span>}
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
            {loc.label} · {loc.dateLabel}
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
  const [active, setActive] = useState<Set<LocationCategory>>(new Set(ALL_CATEGORIES));
  const [selected, setSelected] = useState<LocationEntry | null>(null);
  const [locations, setLocations] = useState<LocationEntry[]>(SAMPLE_LOCATIONS);

  function openExpanded(open: boolean) {
    setSelected(null);
    setExpanded(open);
  }

  function toggleCategory(cat: LocationCategory) {
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
      .then(([, locs]) => {
        if (cancelled || !mapRef.current) return;
        setLocations(locs);
        const { kakao } = window;
        const map = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(37.5665, 126.978),
          level: 8,
        });
        renderMarkers(
          map,
          locs,
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
            <CategoryToggleLegend active={active} onToggle={toggleCategory} />
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
              <CategoryToggleLegend active={active} onToggle={toggleCategory} showLabel />
            </div>
            <div className="pointer-events-none absolute bottom-4 left-4 z-20 rounded-md bg-black/70 px-3 py-1.5 text-[9px] tracking-widest text-white/50 backdrop-blur">
              핀을 클릭하면 사진이 보여요 · 마우스오버는 폴더 라벨 · 크고 밝은 핀 = 가장 최근 폴더
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
