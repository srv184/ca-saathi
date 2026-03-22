import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/health",
  "/api/portal",
  "/portal",
  "/_next",
  "/favicon.ico",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Get token from cookie
  const token = req.cookies.get("ca_saathi_token")?.value;

  // No token — redirect to login for pages, return 401 for API
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Verify token
  try {
    const payload = verifyToken(token);

    // Add firm and user info to headers for API routes
    const headers = new Headers(req.headers);
    headers.set("x-user-id", payload.id);
    headers.set("x-firm-id", payload.firmId);
    headers.set("x-user-role", payload.role);
    headers.set("x-user-name", payload.name);

    return NextResponse.next({ request: { headers } });
  } catch {
    // Invalid token — redirect to login
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete("ca_saathi_token");
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)",
  ],
};
