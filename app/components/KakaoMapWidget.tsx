"use client";

import { useEffect, useRef, useState } from "react";

// Kakao Maps JavaScript 키 — 도메인 제한 키라 클라이언트 노출이 안전함 (hocation.netlify.app 로 제한 등록됨)
const KAKAO_JS_KEY = "5abc14a5fd9dcdacbb5802bd0e25dc33";

// TODO: 실제 업로드된 로케이션 주소로 교체 예정. 지금은 구조/디자인 단계라 샘플 주소로 지도-연동 자체만 검증
const SAMPLE_LOCATIONS = [
  { name: "집 공간 01", address: "서울 강남구 테헤란로 152" },
  { name: "카페 공간 01", address: "서울 마포구 양화로 133" },
  { name: "운동장 공간 01", address: "서울 송파구 올림픽로 25" },
  { name: "집 공간 02", address: "서울 성동구 왕십리로 115" },
];

declare global {
  interface Window {
    kakao: any;
  }
}

export default function KakaoMapWidget() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    function initMap() {
      if (cancelled || !mapRef.current || !window.kakao?.maps) return;

      window.kakao.maps.load(() => {
        if (cancelled || !mapRef.current) return;
        const { kakao } = window;

        const map = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(37.5665, 126.978),
          level: 8,
        });

        const geocoder = new kakao.maps.services.Geocoder();
        const bounds = new kakao.maps.LatLngBounds();
        let done = 0;
        let found = 0;

        SAMPLE_LOCATIONS.forEach((loc) => {
          geocoder.addressSearch(loc.address, (result: any[], resultStatus: string) => {
            done += 1;
            if (resultStatus === kakao.maps.services.Status.OK && result[0]) {
              const coords = new kakao.maps.LatLng(Number(result[0].y), Number(result[0].x));
              new kakao.maps.Marker({ map, position: coords, title: loc.name });
              bounds.extend(coords);
              found += 1;
            }
            if (done === SAMPLE_LOCATIONS.length) {
              if (found > 0) map.setBounds(bounds);
              setStatus("ready");
            }
          });
        });
      });
    }

    if (window.kakao?.maps) {
      initMap();
    } else {
      const existing = document.getElementById("kakao-map-sdk") as HTMLScriptElement | null;
      if (!existing) {
        const script = document.createElement("script");
        script.id = "kakao-map-sdk";
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false&libraries=services`;
        script.async = true;
        script.onload = initMap;
        script.onerror = () => !cancelled && setStatus("error");
        document.head.appendChild(script);
      } else {
        existing.addEventListener("load", initMap);
      }
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return (
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
    </div>
  );
}
