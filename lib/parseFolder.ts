// 폴더명 파싱 규칙
// 구조: 공간(집/공장/복도/영화관…) > 회차 폴더("집1차") > 로케이션 폴더("YYYYMMDD-장소명-주소") > 사진

// 회차 폴더: "{공간}{n}차" — 공간 접두어는 생략 가능 ("1차"만 써도 인식)
export function parseRound(name: string): { space: string; round: number } | null {
  const m = name.trim().match(/^(.*?)(\d+)차$/);
  return m ? { space: m[1].trim(), round: Number(m[2]) } : null;
}

// 로케이션 폴더: "YYYYMMDD-장소명-주소"
// 앞 하이픈 2개까지만 분리 → 주소 안의 하이픈(277-5)은 그대로 유지. 장소명에는 하이픈 금지.
// 폴더 행의 회차 번호를 구한다 — round 컬럼이 있으면 그대로, 없으면(구DB) label에서 파싱.
export function folderRound(f: { round?: number | null; label: string }): number | null {
  return f.round ?? parseRound(f.label)?.round ?? null;
}

export function parseLocation(name: string): { date: string; place: string; address: string } | null {
  const m = name.trim().match(/^(\d{8})-([^-]+)-(.+)$/);
  if (!m) return null;
  const [, d, place, address] = m;
  return {
    date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
    place: place.trim(),
    address: address.trim(),
  };
}
