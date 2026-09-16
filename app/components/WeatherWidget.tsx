"use client";

import { useEffect, useState } from "react";
import { Sun, Cloud, CloudSun, CloudRain, CloudSnow, Droplets, ChevronRight } from "lucide-react";

type DayForecast = {
  date: string; // YYYYMMDD
  min: number | null;
  max: number | null;
  sky: string;
  pop: number | null;
};

// 기상청 하늘상태 텍스트(단기: 맑음/구름많음/흐림, 중기: 흐리고 비 등) → 아이콘 매핑
function getSkyIcon(sky: string) {
  if (sky.includes("눈")) return CloudSnow;
  if (sky.includes("비") || sky.includes("소나기")) return CloudRain;
  if (sky.includes("흐리") || sky.includes("흐림")) return Cloud;
  if (sky.includes("구름많음")) return CloudSun;
  if (sky.includes("맑음")) return Sun;
  return CloudSun;
}

export default function WeatherWidget() {
  const [days, setDays] = useState<DayForecast[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/weather")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.days || data.days.length === 0) {
          setError(true);
        } else {
          setDays(data.days);
        }
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  function fmtDay(dateStr: string, idx: number) {
    if (idx === 0) return "오늘";
    if (idx === 1) return "내일";
    const m = dateStr.slice(4, 6);
    const d = dateStr.slice(6, 8);
    return `${m}/${d}`;
  }

  return (
    <div className="relative flex h-56 w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[9px] tracking-widest text-[#deff9a]/80">서울・경기 WEATHER</span>
        <a
          href="https://www.weather.go.kr/w/weather/forecast/mid-term.do?stnId1=109"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] tracking-widest text-white/20 underline decoration-dotted underline-offset-2 transition-colors hover:text-[#deff9a]/70"
        >
          기상청 공식 데이터 ↗{days && days.length > 3 ? ` · ${days.length}일` : ""}
        </a>
      </div>

      {error && (
        <div className="flex flex-1 items-center justify-center text-center text-xs tracking-widest text-white/20">
          날씨 정보를 불러올 수 없습니다
        </div>
      )}

      {!error && !days && (
        <div className="flex flex-1 items-center justify-center text-xs tracking-widest text-white/20">
          WEATHER LOADING...
        </div>
      )}

      {!error && days && days.length > 0 && (
        <div className="relative flex-1">
          <div className="scrollbar-thin flex h-full snap-x snap-mandatory items-stretch gap-2 overflow-x-auto pb-1 pr-6">
            {days.map((d, idx) => {
              const Icon = getSkyIcon(d.sky);
              return (
                <div
                  key={d.date}
                  className="flex min-w-[52px] shrink-0 snap-start flex-col items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-2 py-3"
                >
                  <span className="text-[10px] tracking-wide text-white/50">{fmtDay(d.date, idx)}</span>
                  <Icon size={16} strokeWidth={1.2} className="my-2 text-[#deff9a]/70" />
                  <span className="whitespace-nowrap text-[10px] text-white/70">
                    {d.max !== null ? `${d.max}°` : "-"} / {d.min !== null ? `${d.min}°` : "-"}
                  </span>
                  {d.pop !== null && (
                    <span className="mt-1 flex items-center gap-0.5 text-[9px] text-white/30">
                      <Droplets size={9} />
                      {d.pop}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {/* 더 많은 날짜가 있음을 알려주는 우측 페이드 + 화살표 힌트 */}
          {days.length > 4 && (
            <div className="pointer-events-none absolute right-0 top-0 flex h-full w-8 items-center justify-end bg-gradient-to-l from-[#0A0A0A] to-transparent">
              <ChevronRight size={12} className="mr-0.5 text-white/20" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
