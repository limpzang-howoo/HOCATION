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
  const update: Record<string, string | null> = {};
  if (typeof body?.name === "string" && body.name.trim()) update.name = body.name.trim();
  if (typeof body?.access_code === "string" && body.access_code.trim()) update.access_code = body.access_code.trim();
  if (typeof body?.code === "string") update.code = body.code.trim() ? body.code.trim() : null;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("brands")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ brand: data });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!supabaseAdmin) return NextResponse.json({ error: "admin client not configured" }, { status: 500 });

  const brandId = Number(params.id);

  const { data: folders } = await supabaseAdmin.from("folders").select("id").eq("brand_id", brandId);
  const folderIds = (folders ?? []).map((f: any) => f.id);

  if (folderIds.length > 0) {
    const { data: locs } = await supabaseAdmin.from("locations").select("id").in("folder_id", folderIds);
    const locIds = (locs ?? []).map((l: any) => l.id);

    if (locIds.length > 0) {
      const { data: photoRows } = await supabaseAdmin
        .from("photos")
        .select("storage_path")
        .in("location_id", locIds);
      const paths = (photoRows ?? []).map((p: any) => p.storage_path);
      if (paths.length > 0) {
        await supabaseAdmin.storage.from("location-photos").remove(paths);
      }
    }

    // 폴더 삭제 → locations/photos 는 FK cascade로 함께 삭제됨
    await supabaseAdmin.from("folders").delete().in("id", folderIds);
  }

  await supabaseAdmin.from("categories").delete().eq("brand_id", brandId);

  const { error } = await supabaseAdmin.from("brands").delete().eq("id", brandId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
