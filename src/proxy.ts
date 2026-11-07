import { NextRequest, NextResponse } from "next/server";
import { requireDoctor } from "@/lib/doctor-auth";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") return NextResponse.next();
  try {
    await requireDoctor(request);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
}
export const config = { matcher: ["/admin/:path*"] };
