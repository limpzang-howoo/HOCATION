import { NextRequest, NextResponse } from "next/server";

// 카카오모빌리티 길찾기 — REST API 키는 서버에서만 사용(클라이언트 노출 없음).
// Netlify 환경변수에 KAKAO_REST_API_KEY 추가 필요 (카카오 디벨로퍼스 > 내 앱 > 앱 키 > REST API 키).
const KAKAO_REST_KEY = process.env.KAKAO_REST_API_KEY;

export async function GET(req: NextRequest) {
  if (!KAKAO_REST_KEY) {
    return NextResponse.json(
      { error: "KAKAO_REST_API_KEY가 설정되지 않았어요 — Netlify 환경변수에 추가해줘" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const origin = searchParams.get("origin"); // "lng,lat"
  const destination = searchParams.get("destination"); // "lng,lat"
  if (!origin || !destination) {
    return NextResponse.json({ error: "origin, destination required" }, { status: 400 });
  }

  const url = new URL("https://apis-navi.kakaomobility.com/v1/directions");
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  url.searchParams.set("priority", "RECOMMEND");

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
    });
    const json: any = await res.json().catch(() => null);
    const route = json?.routes?.[0];

    if (!res.ok || !route) {
      return NextResponse.json({ error: "길찾기 결과를 가져오지 못했어요" }, { status: 502 });
    }
    if (route.result_code !== 0) {
      return NextResponse.json({ error: route.result_msg ?? "경로를 찾지 못했어요" }, { status: 404 });
    }

    const path: { lat: number; lng: number }[] = [];
    for (const section of route.sections ?? []) {
      for (const road of section.roads ?? []) {
        const v: number[] = road.vertexes ?? [];
        for (let i = 0; i < v.length; i += 2) {
          path.push({ lng: v[i], lat: v[i + 1] });
        }
      }
    }

    return NextResponse.json({
      distanceMeters: route.summary?.distance ?? 0,
      durationSeconds: route.summary?.duration ?? 0,
      path,
    });
  } catch {
    return NextResponse.json({ error: "길찾기 요청 중 오류가 발생했어요" }, { status: 500 });
  }
}
