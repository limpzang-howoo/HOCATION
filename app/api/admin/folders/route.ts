import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { ADMIN_TOKEN } from "../../../../lib/adminToken";
import { parseRound } from "../../../../lib/parseFolder";

export const dynamic = "force-dynamic";

function isAuthed(req: NextRequest) {
  return req.headers.get("x-admin-key") === ADMIN_TOKEN;
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!supabaseAdmin) return NextResponse.json({ error: "admin client not configured" }, { status: 500 });

  const body = await req.json();
  const { brand_id, category, mmdd, label } = body ?? {};
  if (!brand_id || !category || !mmdd || !label) {
    return NextResponse.json({ error: "brand_id, category, mmdd, label required" }, { status: 400 });
  }

  const insert: Record<string, unknown> = {
    brand_id,
    category,
    mmdd,
    label,
    folder_name: `${mmdd}_${label}`,
  };
  const round = parseRound(label)?.round;
  if (round != null) insert.round = round;

  // round 컬럼이 아직 없는 구DB에서도 실패하지 않도록, 실패하면 그 필드만 빼고 재시도
  let { data, error } = await supabaseAdmin.from("folders").insert(insert).select().single();
  if (error && "round" in insert) {
    delete insert.round;
    ({ data, error } = await supabaseAdmin.from("folders").insert(insert).select().single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ folder: data });
}
