import { NextResponse, type NextRequest } from "next/server";
import { CUSTOMER_LOGIN, safeNext } from "@/lib/auth/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// OAuth (Google) returns here with a one-time code; exchange it for a session cookie, then continue.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  if (!code) return NextResponse.redirect(new URL(`${CUSTOMER_LOGIN}?error=oauth`, request.url));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL(`${CUSTOMER_LOGIN}?error=oauth`, request.url));
  return NextResponse.redirect(new URL(next, request.url));
}
