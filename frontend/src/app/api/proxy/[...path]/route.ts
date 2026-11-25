import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_API_URL ||
  "https://emergency-ambulance-backend-sovv.onrender.com/api/v1";

let refreshPromise: Promise<string | null> | null = null;

async function refreshTokens(refreshToken: string): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/auth/refresh-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.data.accessToken as string;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetUrl = new URL(
    `${BACKEND_URL}/${path.join("/")}${req.nextUrl.search}`
  );

  let accessToken = req.cookies.get("access_token")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;

  const headers: HeadersInit = {};
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const contentType = req.headers.get("content-type");
  let body: any = undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    if (contentType?.includes("multipart/form-data")) {
      body = await req.formData();
    } else {
      try {
        body = await req.text();
        headers["Content-Type"] = contentType || "application/json";
      } catch {}
    }
  }

  let response = await fetch(targetUrl.toString(), {
    method: req.method,
    headers,
    body,
  });

  // Mutex refresh if 401
  let newAccessToken: string | null = null;
  if (response.status === 401 && refreshToken) {
    newAccessToken = await refreshTokens(refreshToken);
    if (newAccessToken) {
      headers["Authorization"] = `Bearer ${newAccessToken}`;
      response = await fetch(targetUrl.toString(), {
        method: req.method,
        headers,
        body,
      });
    }
  }

  const data = await response.text();
  const nextRes = new NextResponse(data, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json",
    },
  });

  if (newAccessToken) {
    nextRes.cookies.set("access_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });
  }

  return nextRes;
}

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const DELETE = handler;
