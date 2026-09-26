import { NextRequest } from "next/server";
import { ZipArchive } from "archiver";
import { Readable } from "stream";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { locationPhotoUrl } from "../../../lib/supabaseClient";
import { folderRound } from "../../../lib/parseFolder";

// 사진을 서버에서 직접 모아 ZIP으로 스트리밍 다운로드.
// 브라우저가 압축을 하지 않으니(메모리 부담 없음) 사진이 많거나 커도 안정적으로 받을 수 있음.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ZipItem = { path: string; name: string };

async function collectRoundItems(brandId: number, round: number): Promise<{ items: ZipItem[]; zipName: string }> {
  const zipName = `${round}차_전체`;
  const { data: folders } = await supabaseAdmin!.from("folders").select("id,category,round,label").eq("brand_id", brandId);
  const roundFolders = (folders ?? []).filter((f: any) => folderRound(f) === round);
  if (roundFolders.length === 0) return { items: [], zipName };

  const { data: cats } = await supabaseAdmin!.from("categories").select("slug,name").eq("brand_id", brandId);
  const catNameOf = (slug: string) => (cats ?? []).find((c: any) => c.slug === slug)?.name ?? slug;
  const folderCat = new Map(roundFolders.map((f: any) => [f.id, f.category]));

  const folderIds = roundFolders.map((f: any) => f.id);
  const { data: locs } = await supabaseAdmin!.from("locations").select("id,name,folder_id").in("folder_id", folderIds);
  const locList = locs ?? [];
  if (locList.length === 0) return { items: [], zipName };

  const { data: photoRows } = await supabaseAdmin!
    .from("photos")
    .select("storage_path,sort_order,location_id")
    .in("location_id", locList.map((l: any) => l.id))
    .order("sort_order", { ascending: true });

  const items: ZipItem[] = [];
  locList.forEach((l: any) => {
    const spaceName = catNameOf(folderCat.get(l.folder_id) ?? "");
    (photoRows ?? [])
      .filter((p: any) => p.location_id === l.id)
      .forEach((p: any, i: number) => {
        items.push({ path: p.storage_path, name: `${spaceName}/${l.name}_${String(i + 1).padStart(2, "0")}.jpg` });
      });
  });

  return { items, zipName };
}

async function collectCategoryItems(
  brandId: number,
  category: string,
  round: number
): Promise<{ items: ZipItem[]; zipName: string }> {
  const { data: cat } = await supabaseAdmin!
    .from("categories")
    .select("name")
    .eq("brand_id", brandId)
    .eq("slug", category)
    .single();
  const zipName = `${cat?.name ?? category}_${round}차`;

  const { data: folders } = await supabaseAdmin!
    .from("folders")
    .select("id,category,round,label")
    .eq("brand_id", brandId)
    .eq("category", category);
  const folderIds = (folders ?? []).filter((f: any) => folderRound(f) === round).map((f: any) => f.id);
  if (folderIds.length === 0) return { items: [], zipName };

  const { data: locs } = await supabaseAdmin!.from("locations").select("id,name").in("folder_id", folderIds);
  const locList = locs ?? [];
  if (locList.length === 0) return { items: [], zipName };

  const { data: photoRows } = await supabaseAdmin!
    .from("photos")
    .select("storage_path,sort_order,location_id")
    .in("location_id", locList.map((l: any) => l.id))
    .order("sort_order", { ascending: true });

  const items: ZipItem[] = [];
  locList.forEach((l: any) => {
    (photoRows ?? [])
      .filter((p: any) => p.location_id === l.id)
      .forEach((p: any, i: number) => {
        items.push({ path: p.storage_path, name: `${l.name}_${String(i + 1).padStart(2, "0")}.jpg` });
      });
  });

  return { items, zipName };
}

async function collectLocationItems(locationId: string): Promise<{ items: ZipItem[]; zipName: string }> {
  const { data: loc } = await supabaseAdmin!.from("locations").select("id,name").eq("id", locationId).single();
  const zipName = loc?.name ?? locationId;

  const { data: photoRows } = await supabaseAdmin!
    .from("photos")
    .select("storage_path,sort_order")
    .eq("location_id", locationId)
    .order("sort_order", { ascending: true });

  const items: ZipItem[] = (photoRows ?? []).map((p: any, i: number) => ({
    path: p.storage_path,
    name: `${zipName}_${String(i + 1).padStart(2, "0")}.jpg`,
  }));

  return { items, zipName };
}

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ error: "서버 설정이 아직 안 됐어요" }), { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const brandId = Number(searchParams.get("id"));
  const roundParam = searchParams.get("round");
  const round = roundParam != null ? Number(roundParam) : NaN;
  const category = searchParams.get("category");
  const locationId = searchParams.get("location");

  if (!brandId && !locationId) {
    return new Response(JSON.stringify({ error: "id가 필요해요" }), { status: 400 });
  }

  let result: { items: ZipItem[]; zipName: string };
  try {
    if (locationId) {
      result = await collectLocationItems(locationId);
    } else if (category && Number.isFinite(round)) {
      result = await collectCategoryItems(brandId, category, round);
    } else if (Number.isFinite(round)) {
      result = await collectRoundItems(brandId, round);
    } else {
      return new Response(JSON.stringify({ error: "round 또는 location이 필요해요" }), { status: 400 });
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? "조회 실패" }), { status: 500 });
  }

  if (result.items.length === 0) {
    return new Response(JSON.stringify({ error: "다운로드할 사진이 없어요" }), { status: 404 });
  }

  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on("error", () => {
    /* 스트림 도중 에러는 그냥 연결을 끊는다 — 이미 헤더가 나간 뒤라 JSON 에러를 못 돌려줌 */
  });

  (async () => {
    for (const item of result.items) {
      try {
        const url = locationPhotoUrl(item.path);
        if (!url) continue;
        const res = await fetch(url);
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        archive.append(buf, { name: item.name });
      } catch {
        // 사진 한 장 실패는 건너뛰고 계속 진행
      }
    }
    archive.finalize();
  })();

  const webStream = Readable.toWeb(archive as unknown as Readable) as ReadableStream<Uint8Array>;
  const encodedName = encodeURIComponent(`${result.zipName}.zip`);

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
    },
  });
}
