import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { ADMIN_TOKEN } from "../../../../../lib/adminToken";

export const dynamic = "force-dynamic";

function isAuthed(req: NextRequest) {
  return req.headers.get("x-admin-key") === ADMIN_TOKEN;
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!supabaseAdmin) return NextResponse.json({ error: "admin client not configured" }, { status: 500 });

  const { data: photo, error: fetchError } = await supabaseAdmin
    .from("photos")
    .select("storage_path")
    .eq("id", params.id)
    .single();
  if (fetchError || !photo) return NextResponse.json({ error: "not found" }, { status: 404 });

  await supabaseAdmin.storage.from("location-photos").remove([photo.storage_path]);

  const { error } = await supabaseAdmin.from("photos").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
