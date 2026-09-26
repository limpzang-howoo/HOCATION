import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { ADMIN_TOKEN } from "../../../../../lib/adminToken";

export const dynamic = "force-dynamic";

function isAuthed(req: NextRequest) {
  return req.headers.get("x-admin-key") === ADMIN_TOKEN;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!supabaseAdmin) return NextResponse.json({ error: "admin client not configured" }, { status: 500 });

  const body = await req.json();
  const update: Record<string, unknown> = {};
  if (typeof body?.name === "string" && body.name.trim()) update.name = body.name.trim();
  if (typeof body?.address === "string") update.address = body.address.trim();
  if (typeof body?.shoot_date === "string") update.shoot_date = body.shoot_date.trim() || null;
  if (body?.report && typeof body.report === "object") update.report = body.report;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  // shoot_date/report 컬럼이 아직 없는 구DB에서도 실패하지 않도록, 실패하면 그 필드들만 빼고 재시도
  let { data, error } = await supabaseAdmin.from("locations").update(update).eq("id", params.id).select().single();
  if (error && ("shoot_date" in update || "report" in update)) {
    delete update.shoot_date;
    delete update.report;
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "report/shoot_date 컬럼이 아직 없어요 — 마이그레이션 SQL을 먼저 실행해줘" }, { status: 500 });
    }
    ({ data, error } = await supabaseAdmin.from("locations").update(update).eq("id", params.id).select().single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ location: data });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!supabaseAdmin) return NextResponse.json({ error: "admin client not configured" }, { status: 500 });

  const { data: photoRows } = await supabaseAdmin
    .from("photos")
    .select("storage_path")
    .eq("location_id", params.id);
  const paths = (photoRows ?? []).map((p: any) => p.storage_path);
  if (paths.length > 0) {
    await supabaseAdmin.storage.from("location-photos").remove(paths);
  }

  const { error } = await supabaseAdmin.from("locations").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
