import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { ADMIN_TOKEN } from "../../../../lib/adminToken";

export const dynamic = "force-dynamic";

function isAuthed(req: NextRequest) {
  return req.headers.get("x-admin-key") === ADMIN_TOKEN;
}

function makeSlug() {
  return `cat_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!supabaseAdmin) return NextResponse.json({ error: "admin client not configured" }, { status: 500 });

  const body = await req.json();
  const { brand_id, name } = body ?? {};
  if (!brand_id || !name) {
    return NextResponse.json({ error: "brand_id, name required" }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("categories")
    .select("sort_order")
    .eq("brand_id", brand_id)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSort = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabaseAdmin
    .from("categories")
    .insert({ brand_id, name, slug: makeSlug(), sort_order: nextSort })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category: data });
}
