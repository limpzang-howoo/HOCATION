"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";

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

// ── 폴더명으로 회차(1차/2차/3차...) 자동 인식 ──
// 업로드 규칙: "MMDD_라벨" (예: 0918_집자료, 0925_집자료). 같은 카테고리 안에서
// 날짜가 빠른 폴더부터 1차, 2차... 로 자동 배정됨. 회차 수는 폴더가 늘어나는 만큼 자동으로 늘어남.
type RawLocation = {
  category: LocationCategory;
  folderName: string; // 예: "0918_집자료"
  name: string;
  address: string;
};

// TODO: 실제로는 Supabase에 업로드된 폴더 목록을 그대로 이 형태로 넣으면 됨.
// 지금은 구조/디자인 단계라 사용자가 말한 "0918_집자료 / 0925_집자료" 규칙을 그대로 샘플로 재현.
const RAW_LOCATIONS: RawLocation[] = [
  { category: "home", folderName: "0918_집자료", name: "테헤란로 사옥", address: "서울 강남구 테헤란로 152" },
  { category: "home", folderName: "0918_집자료", name: "왕십리 주택", address: "서울 성동구 왕십리로 115" },
  { category: "home", folderName: "0925_집자료", name: "연남동 단독주택", address: "서울 마포구 성미산로 100" },
  { category: "cafe", folderName: "0918_카페자료", name: "합정 카페", address: "서울 마포구 양화로 133" },
  { category: "playground", folderName: "0918_운동장자료", name: "잠실 운동장", address: "서울 송파구 올림픽로 25" },
  { category: "playground", folderName: "0925_운동장자료", name: "고척 운동장", address: "서울 구로구 경인로 430" },
  { category: "playground", folderName: "1002_운동장자료", name: "목동 운동장", address: "서울 양천구 안양천로 939" },
];

type LocationEntry = {
  name: string;
  address: string;
  category: LocationCategory;
  round: number;
  roundLabel: string; // "09/18"
  isLatestRound: boolean;
};

function parseFolderDate(folderName: string): { mmdd: string; label: string } | null {
  const m = folderName.match(/^(\d{4})_(.+)$/); // MMDD_라벨
  if (!m) return null;
  return { mmdd: m[1], label: m[2] };
}

// 폴더명 규칙(MMDD_라벨)에서 카테고리별로 날짜순 정렬 → 회차 자동 부여
function buildLocationsWithRounds(raw: RawLocation[]): LocationEntry[] {
  const byCategory: Record<LocationCategory, RawLocation[]> = { home: [], cafe: [], playground: [] };
  raw.forEach((r) => byCategory[r.category].push(r));

  const result: LocationEntry[] = [];

  (Object.keys(byCategory) as LocationCategory[]).forEach((cat) => {
    const items = byCategory[cat];
    // 이 카테고리 안에 있는 회차 폴더(날짜)들을 오름차순 정렬
    const uniqueDates = Array.from(
      new Set(items.map((r) => parseFolderDate(r.folderName)?.mmdd ?? "9999"))
    ).sort();
    const maxRound = uniqueDates.length;

    items.forEach((r) => {
      const parsed = parseFolderDate(r.folderName);
      const mmdd = parsed?.mmdd ?? "9999";
      const round = uniqueDates.indexOf(mmdd) + 1;
      const roundLabel = mmdd.length === 4 ? `${mmdd.slice(0, 2)}/${mmdd.slice(2, 4)}` : mmdd;
      result.push({
        name: r.name,
        address: r.address,
        category: r.category,
        round,
        roundLabel,
        isLatestRound: round === maxRound,
      });
    });
  });

  return result;
}

const SAMPLE_LOCATIONS: LocationEntry[] = buildLocationsWithRounds(RAW_LOCATIONS);

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

// 카테고리 색상 핀 + 회차 번호 배지. 최신 회차는 조금 더 크고 은은한 글로우를 둘러 강조.
function pinImageSrc(color: string, round: number, isLatest: boolean) {
  const label = round <= 9 ? String(round) : "9+";
  const glow = isLatest
    ? `<circle cx="14" cy="14" r="13" fill="${color}" opacity="0.22"/>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 38">${glow}<path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.3 21.7 0 14 0z" fill="${color}"/><circle cx="14" cy="14" r="6.2" fill="white"/><text x="14" y="17" font-size="8" text-anchor="middle" font-family="ui-monospace, monospace" font-weight="700" fill="${color}">${label}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// 마우스오버 시 뜨는 장소명 + 회차 말풍선 HTML
function tooltipHtml(loc: LocationEntry) {
  return `<div style="transform:translateY(-6px);padding:4px 9px;border-radius:8px;background:rgba(0,0,0,0.85);color:#deff9a;font-size:11px;white-space:nowrap;font-family:inherit;border:1px solid rgba(222,255,154,0.3);">${loc.name} · ${loc.round}차 (${loc.roundLabel})</div>`;
}

function renderMarkers(map: any, onDone?: (entries: MarkerEntry[]) => void) {
  const { kakao } = window;
  const geocoder = new kakao.maps.services.Geocoder();
  const bounds = new kakao.maps.LatLngBounds();
  let done = 0;
  let found = 0;
  const entries: MarkerEntry[] = [];

  SAMPLE_LOCATIONS.forEach((loc) => {
    geocoder.addressSearch(loc.address, (result: any[], resultStatus: string) => {
      done += 1;
      if (resultStatus === kakao.maps.services.Status.OK && result[0]) {
        const coords = new kakao.maps.LatLng(Number(result[0].y), Number(result[0].x));
        const size = loc.isLatestRound ? 34 : 26;
        const height = loc.isLatestRound ? 46 : 35;
        const markerImage = new kakao.maps.MarkerImage(
          pinImageSrc(CATEGORY_COLORS[loc.category], loc.round, loc.isLatestRound),
          new kakao.maps.Size(size, height),
          { offset: new kakao.maps.Point(size / 2, height) }
        );
        const marker = new kakao.maps.Marker({ map, position: coords, title: loc.name, image: markerImage });

        // 마우스오버 시 이름/회차 툴팁
        const overlay = new kakao.maps.CustomOverlay({
          position: coords,
          content: tooltipHtml(loc),
          yAnchor: loc.isLatestRound ? 2.3 : 1.9,
          zIndex: 20,
        });
        kakao.maps.event.addListener(marker, "mouseover", () => overlay.setMap(map));
        kakao.maps.event.addListener(marker, "mouseout", () => overlay.setMap(null));

        entries.push({ marker, overlay, category: loc.category, map });
        bounds.extend(coords);
        found += 1;
      }
      if (done === SAMPLE_LOCATIONS.length) {
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

export default function KakaoMapWidget() {
  const mapRef = useRef<HTMLDivElement>(null);
  const modalMapRef = useRef<HTMLDivElement>(null);
  const compactEntriesRef = useRef<MarkerEntry[]>([]);
  const modalEntriesRef = useRef<MarkerEntry[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState<Set<LocationCategory>>(new Set(ALL_CATEGORIES));

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

  // 작은 위젯 지도
  useEffect(() => {
    let cancelled = false;
    loadKakaoSdk()
      .then(() => {
        if (cancelled || !mapRef.current) return;
        const { kakao } = window;
        const map = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(37.5665, 126.978),
          level: 8,
        });
        renderMarkers(map, (entries) => {
          if (cancelled) return;
          compactEntriesRef.current = entries;
          setStatus("ready");
        });
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, []);

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
      renderMarkers(map, (entries) => {
        if (cancelled) return;
        modalEntriesRef.current = entries;
        // 이미 꺼둔 카테고리는 모달에도 그대로 반영
        entries.forEach((entry) => {
          if (!active.has(entry.category)) entry.marker.setMap(null);
        });
      });
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
              onClick={() => setExpanded(true)}
              className="flex items-center gap-1 rounded-md bg-[#deff9a] px-2.5 py-1.5 text-[10px] font-medium tracking-widest text-black shadow-lg shadow-black/40 transition-transform active:scale-95 hover:bg-[#deff9a]/90"
            >
              <Maximize2 size={12} /> 확대
            </button>
          </div>
        )}
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
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
              핀 안 숫자 = 회차 (1차→2차→3차...) · 크고 밝은 핀 = 해당 공간의 최신 회차
            </div>
            <button
              onClick={() => setExpanded(false)}
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
