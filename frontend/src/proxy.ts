import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkAccess, needsSession } from "@/lib/auth/routes";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { AREA_HEADER, areaForPath } from "@/i18n/config";

// Runs before every page: refreshes the Supabase session cookie, applies the optimistic route rules and tells
// i18n/request.ts which part of the app is rendering.
export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(AREA_HEADER, areaForPath(request.nextUrl.pathname));

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  // Public pages (landing, login, OAuth callback) need no session check; the browser client refreshes its own token.
  if (!needsSession(request.nextUrl.pathname)) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Must run before the response is produced so a refreshed token can be written back.
  const { data } = await supabase.auth.getClaims();
  const access = checkAccess(request.nextUrl.pathname, data?.claims ?? null, request.nextUrl.search);
  if (!access.allow) {
    const redirect = NextResponse.redirect(new URL(access.redirectTo, request.url));
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp|ico|js)$).*)"],
};
