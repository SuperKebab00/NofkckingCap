import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE = "no-cap-admin-session";
const REFRESH_COOKIE = "no-cap-admin-refresh";

function isAccessTokenFresh(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return false;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const parsed = JSON.parse(atob(normalized)) as { exp?: unknown };
    return typeof parsed.exp === "number" && parsed.exp * 1000 > Date.now() + 60_000;
  } catch {
    return false;
  }
}

function appendCookie(header: string, name: string, value: string) {
  const pairs = header
    .split(";")
    .map((item) => item.trim())
    .filter((item) => item && !item.startsWith(`${name}=`));
  pairs.push(`${name}=${encodeURIComponent(value)}`);
  return pairs.join("; ");
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.APP_ENV === "production",
  };
}

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value || "";
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value || "";

  if (isAccessTokenFresh(accessToken) || !refreshToken) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.next();
  }

  try {
    const response = await fetch(
      `${supabaseUrl.replace(/\/+$/, "")}/auth/v1/token?grant_type=refresh_token`,
      {
        body: JSON.stringify({ refresh_token: refreshToken }),
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );
    const session = (await response.json().catch(() => null)) as
      | { access_token?: string; expires_in?: number; refresh_token?: string }
      | null;

    if (!response.ok || !session?.access_token || !session.refresh_token || !session.expires_in) {
      throw new Error("Sessione non rinnovabile.");
    }

    const requestHeaders = new Headers(request.headers);
    let cookieHeader = requestHeaders.get("cookie") || "";
    cookieHeader = appendCookie(cookieHeader, ACCESS_COOKIE, session.access_token);
    cookieHeader = appendCookie(cookieHeader, REFRESH_COOKIE, session.refresh_token);
    requestHeaders.set("cookie", cookieHeader);

    const next = NextResponse.next({ request: { headers: requestHeaders } });
    next.headers.set("Cache-Control", "private, no-store");
    next.cookies.set(ACCESS_COOKIE, session.access_token, cookieOptions(Math.floor(session.expires_in)));
    next.cookies.set(REFRESH_COOKIE, session.refresh_token, cookieOptions(60 * 60 * 24 * 30));
    return next;
  } catch {
    const next = NextResponse.next();
    next.headers.set("Cache-Control", "private, no-store");
    next.cookies.delete(ACCESS_COOKIE);
    next.cookies.delete(REFRESH_COOKIE);
    return next;
  }
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
