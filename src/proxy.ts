import { NextResponse, type NextRequest } from "next/server";
import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

type RedirectMap = Record<string, { to: string; permanent: boolean }>;
let cache: { at: number; map: RedirectMap } | null = null;
const TTL_MS = 60_000;

async function getRedirectMap(origin: string): Promise<RedirectMap> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;
  try {
    const res = await fetch(`${origin}/api/redirect-map`, { cache: "no-store" });
    if (res.ok) {
      cache = { at: Date.now(), map: (await res.json()) as RedirectMap };
      return cache.map;
    }
  } catch {}
  cache = { at: Date.now(), map: cache?.map ?? {} };
  return cache.map;
}

export default async function proxy(req: NextRequest, evt: never) {
  const { pathname, origin } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (auth as any)(req, evt);
  }

  const key = (pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname).toLowerCase();
  const hit = (await getRedirectMap(origin))[key];
  if (hit && hit.to !== key) {
    const url = new URL(hit.to, origin);
    url.search = req.nextUrl.search;
    return NextResponse.redirect(url, hit.permanent ? 308 : 307);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/((?!api|_next|uploads|.*\\..*).*)"],
};
