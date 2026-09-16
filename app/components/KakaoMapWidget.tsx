"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";

// Kakao Maps JavaScript 키 — 도메인 제한 키라 클라이언트 노출이 안전함 (hocation.netlify.app 로 제한 등록됨)
const KAKAO_JS_KEY = "5abc14a5fd9dcdacbb5802bd0e25dc33";

type LocationCategory = "home" | "cafe" | "playground";

// 공간 카테고리별 핀 색상
const CATEGORY_COLORS: Record<LocationCategory, string> = {
  home: "#1a1a1a", // 집 공간 — 검정
  cafe: "#ef4444", // 카페 공간 — 빨강
  playground: "#16a34a", // 운동장 공간 — 초록
};

// TODO: 실제 업로드된 로케이션 주소로 교체 예정. 지금은 구조/디자인 단계라 샘플 주소로 지도-연동 자체만 검증
const SAMPLE_LOCATIONS: { name: string; address: string; category: LocationCategory }[] = [
  { name: "집 공간 01", address: "서울 강남구 테헤란로 152", category: "home" },
  { name: "카페 공간 01", address: "서울 마포구 양화로 133", category: "cafe" },
  { name: "운동장 공간 01", address: "서울 송파구 올림픽로 25", category: "playground" },
  { name: "집 공간 02", address: "서울 성동구 왕십리로 115", category: "home" },
];

declare global {
  interface Window {
    kakao: any;
  }
}

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

// 카테고리 색상의 심플한 핀 모양 SVG를 마커 이미지로 사용
function pinImageSrc(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38"><path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.3 21.7 0 14 0z" fill="${color}"/><circle cx="14" cy="14" r="5.5" fill="white"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function renderMarkers(map: any, onDone?: () => void) {
  const { kakao } = window;
  const geocoder = new kakao.maps.services.Geocoder();
  const bounds = new kakao.maps.LatLngBounds();
  let done = 0;
  let found = 0;

  SAMPLE_LOCATIONS.forEach((loc) => {
    geocoder.addressSearch(loc.address, (result: any[], resultStatus: string) => {
      done += 1;
      if (resultStatus === kakao.maps.services.Status.OK && result[0]) {
        const coords = new kakao.maps.LatLng(Number(result[0].y), Number(result[0].x));
        const markerImage = new kakao.maps.MarkerImage(
          pinImageSrc(CATEGORY_COLORS[loc.category]),
          new kakao.maps.Size(28, 38),
          { offset: new kakao.maps.Point(14, 38) }
        );
        new kakao.maps.Marker({ map, position: coords, title: loc.name, image: markerImage });
        bounds.extend(coords);
        found += 1;
      }
      if (done === SAMPLE_LOCATIONS.length) {
        if (found > 0) map.setBounds(bounds);
        onDone?.();
      }
    });
  });
}

export default function KakaoMapWidget() {
  const mapRef = useRef<HTMLDivElement>(null);
  const modalMapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [expanded, setExpanded] = useState(false);

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
        renderMarkers(map, () => !cancelled && setStatus("ready"));
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
      renderMarkers(map);
      setTimeout(() => map.relayout(), 60);
    });
    return () => {
      cancelled = true;
    };
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
        <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[9px] tracking-widest text-[#deff9a]/80 backdrop-blur">
          LOCATION SCOUTER
        </div>
        {status === "ready" && (
          <button
            onClick={() => setExpanded(true)}
            className="absolute right-3 top-3 flex items-center justify-center rounded-md bg-black/60 p-1.5 text-white/60 backdrop-blur transition-colors hover:text-[#deff9a]"
            aria-label="지도 크게 보기"
          >
            <Maximize2 size={13} />
          </button>
        )}
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        >
          <div
            className="relative h-[80vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A]"
            onClick={(e) => e.stopPropagation()}
          >
            <div ref={modalMapRef} className="h-full w-full" />
            <div className="pointer-events-none absolute left-4 top-4 flex gap-3 rounded-md bg-black/60 px-3 py-1.5 text-[9px] tracking-widest text-white/60 backdrop-blur">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS.home }} /> 집
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS.cafe }} /> 카페
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS.playground }} /> 운동장
              </span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="absolute right-3 top-3 flex items-center justify-center rounded-md bg-black/60 p-1.5 text-white/60 backdrop-blur transition-colors hover:text-[#deff9a]"
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
