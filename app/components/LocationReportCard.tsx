"use client";

import { MapPin } from "lucide-react";
import { REPORT_FIELDS, ReportData } from "../../lib/reportFields";

// 장소 하나를 한 장으로 보여주는 카드 — 관리자 미리보기와 프로덕션 상세 페이지에서 공용으로 사용.
export default function LocationReportCard({
  name,
  address,
  shootDate,
  report,
}: {
  name: string;
  address?: string | null;
  shootDate?: string | null;
  report: ReportData | null | undefined;
}) {
  const data = report ?? {};
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0A0A0A] p-5">
      <div className="mb-1 text-sm font-light tracking-widest text-white">{name}</div>
      {(address || shootDate) && (
        <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/40">
          {address && (
            <span className="flex items-center gap-1">
              <MapPin size={11} className="shrink-0" /> {address}
            </span>
          )}
          {shootDate && <span className="text-white/25">{shootDate}</span>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {REPORT_FIELDS.map((f) => (
          <div key={f.key}>
            <div className="text-[10px] tracking-widest text-white/30">{f.label}</div>
            <div className="mt-0.5 text-xs text-white/80">
              {data[f.key]?.trim() ? data[f.key] : <span className="text-white/20">미기재</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
