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
  const { brand_id, category, mmdd, label } = body ?? {};
  if (!brand_id || !category || !mmdd || !label) {
    return NextResponse.json({ error: "brand_id, category, mmdd, label required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("folders")
    .insert({
      brand_id,
      category,
      mmdd,
      label,
      folder_name: `${mmdd}_${label}`,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ folder: data });
}
