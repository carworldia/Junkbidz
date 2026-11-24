import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/post", "/jobs", "/account", "/messages", "/hauler", "/become-hauler", "/admin"];

// The one official address. Google treats each address as a separate site, so the others forward here.
const HOME = "https://junkbidz.com";
// Add "junkbidz.pages.dev" here once junkbidz.com is live, so the test address forwards too.
const OLD_HOSTS = new Set(["www.junkbidz.com"]);

export async function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").toLowerCase();
  if (OLD_HOSTS.has(host)) {
    return NextResponse.redirect(new URL(request.nextUrl.pathname + request.nextUrl.search, HOME), 301);
  }
  const res = await handle(request);
  // Test previews (abc123.junkbidz.pages.dev) are kept out of Google.
  if (host.endsWith(".pages.dev")) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

async function handle(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list: { name: string; value: string; options: CookieOptions }[]) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (PROTECTED.some((p) => path === p || path.startsWith(p + "/")) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)"],
};
