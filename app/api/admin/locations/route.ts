import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { ADMIN_TOKEN } from "../../../../lib/adminToken";

export const dynamic = "force-dynamic";

function isAuthed(req: NextRequest) {
  return req.headers.get("x-admin-key") === ADMIN_TOKEN;
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!supabaseAdmin) return NextResponse.json({ error: "admin client not configured" }, { status: 500 });

  const body = await req.json();
  const { folder_id, name, address, shoot_date } = body ?? {};
  if (!folder_id || !name) {
    return NextResponse.json({ error: "folder_id, name required" }, { status: 400 });
  }

  // 정렬 순서: 폴더 안 마지막 다음으로
  const { data: existing } = await supabaseAdmin
    .from("locations")
    .select("sort_order")
    .eq("folder_id", folder_id)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSort = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const insert: Record<string, unknown> = { folder_id, name, address: address ?? "", sort_order: nextSort };
  if (typeof shoot_date === "string" && shoot_date.trim()) insert.shoot_date = shoot_date.trim();

  // shoot_date 컬럼이 아직 없는 구DB에서도 실패하지 않도록, 실패하면 그 필드만 빼고 재시도
  let { data, error } = await supabaseAdmin.from("locations").insert(insert).select().single();
  if (error && "shoot_date" in insert) {
    delete insert.shoot_date;
    ({ data, error } = await supabaseAdmin.from("locations").insert(insert).select().single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ location: data });
}
