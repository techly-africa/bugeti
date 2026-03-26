import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // ── Security headers ──────────────────────────────────────────────────────
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  // ── Block methods we never use on API routes ───────────────────────────────
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/") && !["GET", "POST", "OPTIONS"].includes(req.method)) {
    return new NextResponse(null, { status: 405, headers: { Allow: "GET, POST, OPTIONS" } });
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
