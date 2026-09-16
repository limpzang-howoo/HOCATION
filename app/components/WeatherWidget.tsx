"use client";

import { useEffect, useState } from "react";
import { CloudSun, Droplets } from "lucide-react";

type DayForecast = {
  date: string; // YYYYMMDD
  min: number | null;
  max: number | null;
  sky: string;
  pop: number | null;
};

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
        <span className="text-[9px] tracking-widest text-white/20">기상청 공식 데이터</span>
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
        <div className="flex flex-1 items-stretch gap-2 overflow-x-auto pb-1">
          {days.map((d, idx) => (
            <div
              key={d.date}
              className="flex min-w-[52px] flex-col items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-2 py-3"
            >
              <span className="text-[10px] tracking-wide text-white/50">{fmtDay(d.date, idx)}</span>
              <CloudSun size={16} strokeWidth={1.2} className="my-2 text-[#deff9a]/70" />
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
          ))}
        </div>
      )}
    </div>
  );
}
