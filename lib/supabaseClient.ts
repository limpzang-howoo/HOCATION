import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// 키가 아직 설정 안 됐으면 null — 호출부에서 샘플 데이터로 자연스럽게 폴백
export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export function locationPhotoUrl(storagePath: string): string {
  if (!supabase) return "";
  return supabase.storage.from("location-photos").getPublicUrl(storagePath).data.publicUrl;
}
