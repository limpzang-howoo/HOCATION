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
  const { name, access_code } = body ?? {};
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const slug = `brand-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  const { data: brand, error } = await supabaseAdmin
    .from("brands")
    .insert({ name, slug, access_code: (access_code && String(access_code).trim()) || "1234" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 집공간/카페공간/운동장공간 기본 카테고리를 자동으로 만들어둠 (나중에 관리자 페이지에서 자유롭게 수정 가능)
  await supabaseAdmin
    .from("categories")
    .insert(DEFAULT_CATEGORIES.map((c, i) => ({ brand_id: brand.id, slug: c.slug, name: c.name, sort_order: i })));

  return NextResponse.json({ brand });
}
