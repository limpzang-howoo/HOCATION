import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { ADMIN_TOKEN } from "../../../../lib/adminToken";

export const dynamic = "force-dynamic";

function isAuthed(req: NextRequest) {
  return req.headers.get("x-admin-key") === ADMIN_TOKEN;
}

const DEFAULT_CATEGORIES = [
  { slug: "home", name: "집 공간" },
  { slug: "cafe", name: "카페 공간" },
  { slug: "playground", name: "운동장 공간" },
];

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!supabaseAdmin) return NextResponse.json({ error: "admin client not configured" }, { status: 500 });

  const body = await req.json();
  const { name, access_code, code } = body ?? {};
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const slug = `brand-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  const insert: Record<string, unknown> = {
    name,
    slug,
    access_code: (access_code && String(access_code).trim()) || "1234",
    code: code && String(code).trim() ? String(code).trim() : null,
  };

  // code 컬럼이 아직 없는 구DB에서도 실패하지 않도록, 실패하면 그 필드만 빼고 재시도
  let { data: brand, error } = await supabaseAdmin.from("brands").insert(insert).select().single();
  if (error && "code" in insert) {
    delete insert.code;
    ({ data: brand, error } = await supabaseAdmin.from("brands").insert(insert).select().single());
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 집공간/카페공간/운동장공간 기본 카테고리를 자동으로 만들어둠 (나중에 관리자 페이지에서 자유롭게 수정 가능)
  await supabaseAdmin
    .from("categories")
    .insert(DEFAULT_CATEGORIES.map((c, i) => ({ brand_id: brand.id, slug: c.slug, name: c.name, sort_order: i })));

  return NextResponse.json({ brand });
}
