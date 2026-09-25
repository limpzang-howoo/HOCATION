// 장소 리포트 공통 양식 — 관리자에서 입력하면 프로덕션에서 한 장짜리 카드로 보임.
export type ReportFieldKey =
  | "waitingRoom"
  | "generatorTruck"
  | "restroom"
  | "parking"
  | "catering"
  | "shootWindow"
  | "power"
  | "access"
  | "noise"
  | "rentalFee";

export type ReportField = { key: ReportFieldKey; label: string; placeholder?: string };

export const REPORT_FIELDS: ReportField[] = [
  { key: "waitingRoom", label: "대기실", placeholder: "예: 있음 (4인 기준)" },
  { key: "generatorTruck", label: "발전차 사용", placeholder: "예: 가능 / 불가 / 옥외만" },
  { key: "restroom", label: "화장실", placeholder: "예: 내부 1개, 남녀 구분 없음" },
  { key: "parking", label: "주차 공간", placeholder: "예: 스탭카 3대" },
  { key: "catering", label: "케이터링", placeholder: "예: 가능 / 외부 반입 불가" },
  { key: "shootWindow", label: "촬영 가능 시간", placeholder: "예: 평일 09:00~18:00" },
  { key: "power", label: "전기 용량", placeholder: "예: 단상 220V, 30A" },
  { key: "access", label: "동선/출입", placeholder: "예: 엘리베이터 있음, 4층" },
  { key: "noise", label: "소음/민원", placeholder: "예: 오후 8시 이후 소음 제한" },
  { key: "rentalFee", label: "대관료", placeholder: "예: 시간당 20만원" },
];

export type ReportData = Partial<Record<ReportFieldKey, string>>;
