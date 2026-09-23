import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// 관리자 전용 클라이언트 — service_role 키 사용, API 라우트(서버)에서만 import할 것.
// 절대 "use client" 컴포넌트나 클라이언트 번들에서 import하지 말 것.
export const supabaseAdmin =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;
