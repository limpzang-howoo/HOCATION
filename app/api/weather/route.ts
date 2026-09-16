import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 기상청 공공데이터포털 서비스키 (서버 전용 — 클라이언트 번들에 노출되지 않음)
const SERVICE_KEY = process.env.KMA_SERVICE_KEY ?? "";

// 단기예보 격자좌표 (서울 종로구 기준)
const NX = "60";
const NY = "127";

// 중기예보 지점코드 (중기육상: 서울·인천·경기도 / 중기기온: 서울)
const MID_LAND_REG_ID = "11B00000";
const MID_TA_REG_ID = "11B10101";

const VILAGE_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";
const MID_LAND_URL = "https://apis.data.go.kr/1360000/MidFcstInfoService/getMidLandFcst";
const MID_TA_URL = "https://apis.data.go.kr/1360000/MidFcstInfoService/getMidTa";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// UTC epoch + 9시간 후 getUTC* 로 읽으면 KST 벽시계 값이 나오는 트릭
function nowKST(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function fmtDate(d: Date) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy;
}

// 단기예보 base_date/base_time 계산 (발표 후 약 40분 지연 반영)
function getVilageBaseDateTime() {
  const kst = nowKST();
  const slots = [2, 5, 8, 11, 14, 17, 20, 23];
  const minutesNow = kst.getUTCHours() * 60 + kst.getUTCMinutes();

  let idx = -1;
  for (let i = slots.length - 1; i >= 0; i--) {
    if (minutesNow >= slots[i] * 60 + 40) {
      idx = i;
      break;
    }
  }

  let base = kst;
  if (idx === -1) {
    base = addDays(kst, -1);
    idx = slots.length - 1;
  }

  return { base_date: fmtDate(base), base_time: `${pad(slots[idx])}00` };
}

// 중기예보 tmFc 계산 (06:00 / 18:00 발표, 약 30분 지연 반영)
function getMidTmFc() {
  const kst = nowKST();
  const minutesNow = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  let base = kst;
  let hour: number;

  if (minutesNow >= 18 * 60 + 30) {
    hour = 18;
  } else if (minutesNow >= 6 * 60 + 30) {
    hour = 6;
  } else {
    hour = 18;
    base = addDays(kst, -1);
  }

  return `${fmtDate(base)}${pad(hour)}00`;
}

async function safeFetchJson(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    const json = JSON.parse(text);
    const header = json?.response?.header;
    if (header?.resultCode !== "00") return null;
    return json;
  } catch {
    return null;
  }
}

type DayForecast = {
  date: string; // YYYYMMDD
  min: number | null;
  max: number | null;
  sky: string;
  pop: number | null;
};

export async function GET() {
  if (!SERVICE_KEY) {
    return NextResponse.json({ days: [], error: "SERVICE_KEY_MISSING" });
  }

  const days: DayForecast[] = [];

  // ── 1) 단기예보: 오늘 ~ +2/3일 ──
  try {
    const { base_date, base_time } = getVilageBaseDateTime();
    const params = new URLSearchParams({
      serviceKey: SERVICE_KEY,
      pageNo: "1",
      numOfRows: "1000",
      dataType: "JSON",
      base_date,
      base_time,
      nx: NX,
      ny: NY,
    });
    const json = await safeFetchJson(`${VILAGE_URL}?${params.toString()}`);
    const items: Array<{ category: string; fcstDate: string; fcstValue: string }> =
      json?.response?.body?.items?.item ?? [];

    const byDate = new Map<string, { tmp: number[]; sky: string[]; pop: number[] }>();
    for (const it of items) {
      if (!byDate.has(it.fcstDate)) byDate.set(it.fcstDate, { tmp: [], sky: [], pop: [] });
      const bucket = byDate.get(it.fcstDate)!;
      if (it.category === "TMP") bucket.tmp.push(Number(it.fcstValue));
      if (it.category === "SKY") bucket.sky.push(it.fcstValue);
      if (it.category === "POP") bucket.pop.push(Number(it.fcstValue));
    }

    const SKY_MAP: Record<string, string> = { "1": "맑음", "3": "구름많음", "4": "흐림" };

    Array.from(byDate.keys())
      .sort()
      .forEach((date) => {
        const bucket = byDate.get(date)!;
        days.push({
          date,
          min: bucket.tmp.length ? Math.min(...bucket.tmp) : null,
          max: bucket.tmp.length ? Math.max(...bucket.tmp) : null,
          sky: SKY_MAP[bucket.sky[Math.floor(bucket.sky.length / 2)]] ?? "-",
          pop: bucket.pop.length ? Math.max(...bucket.pop) : null,
        });
      });
  } catch {
    // 단기예보 실패 시 무시하고 진행
  }

  // ── 2) 중기예보: +4일 ~ +10일 (중기예보 활용신청 승인 전에는 조용히 생략됨) ──
  try {
    const tmFc = getMidTmFc();
    const baseDate = tmFc.slice(0, 8);
    const base = new Date(
      Date.UTC(Number(baseDate.slice(0, 4)), Number(baseDate.slice(4, 6)) - 1, Number(baseDate.slice(6, 8)))
    );

    const landParams = new URLSearchParams({
      serviceKey: SERVICE_KEY,
      pageNo: "1",
      numOfRows: "10",
      dataType: "JSON",
      regId: MID_LAND_REG_ID,
      tmFc,
    });
    const taParams = new URLSearchParams({
      serviceKey: SERVICE_KEY,
      pageNo: "1",
      numOfRows: "10",
      dataType: "JSON",
      regId: MID_TA_REG_ID,
      tmFc,
    });

    const [landJson, taJson] = await Promise.all([
      safeFetchJson(`${MID_LAND_URL}?${landParams.toString()}`),
      safeFetchJson(`${MID_TA_URL}?${taParams.toString()}`),
    ]);

    const land = landJson?.response?.body?.items?.item?.[0];
    const ta = taJson?.response?.body?.items?.item?.[0];

    if (land || ta) {
      for (let n = 4; n <= 10; n++) {
        const date = fmtDate(addDays(base, n));
        const wf = n <= 7 ? land?.[`wf${n}Pm`] ?? land?.[`wf${n}Am`] : land?.[`wf${n}`];
        const pop = n <= 7 ? land?.[`rnSt${n}Pm`] ?? land?.[`rnSt${n}Am`] : land?.[`rnSt${n}`];
        const min = ta?.[`taMin${n}`];
        const max = ta?.[`taMax${n}`];
        if (wf === undefined && min === undefined && max === undefined) continue;
        days.push({
          date,
          min: min !== undefined ? Number(min) : null,
          max: max !== undefined ? Number(max) : null,
          sky: wf ?? "-",
          pop: pop !== undefined ? Number(pop) : null,
        });
      }
    }
  } catch {
    // 중기예보 실패 시(활용신청 미승인 등) 무시하고 단기예보 데이터만 반환
  }

  return NextResponse.json({ days });
}
