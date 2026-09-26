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

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const locationId = form.get("location_id") as string | null;
  if (!file || !locationId) {
    return NextResponse.json({ error: "file, location_id required" }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("photos")
    .select("sort_order")
    .eq("location_id", locationId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSort = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const extMatch = file.name.match(/\.[a-zA-Z0-9]+$/);
  const ext = extMatch ? extMatch[0] : ".jpg";
  const path = `${locationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabaseAdmin.storage
    .from("location-photos")
    .upload(path, Buffer.from(arrayBuffer), {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: row, error: insertError } = await supabaseAdmin
    .from("photos")
    .insert({ location_id: locationId, storage_path: path, sort_order: nextSort })
    .select()
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ photo: row });
}
