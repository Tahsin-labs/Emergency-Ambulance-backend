import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("access_token")?.value;
  const userRole = request.cookies.get("user_role")?.value;

  // Protected paths
  const isAdminPath = pathname.startsWith("/admin");
  const isDriverPath = pathname.startsWith("/driver");
  const isPatientPath = pathname.startsWith("/patient");

  if (isAdminPath || isDriverPath || isPatientPath) {
    if (!accessToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isAdminPath && userRole !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    if (isDriverPath && userRole !== "DRIVER") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    if (isPatientPath && userRole !== "PATIENT") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/driver/:path*", "/patient/:path*"],
};
