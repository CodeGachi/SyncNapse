import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware disabled - authentication is handled client-side
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
