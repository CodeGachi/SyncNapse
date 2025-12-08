/**
 * Liveblocks 인증 API Route
 *
 * 프론트엔드에서 Liveblocks 연결 시 백엔드로 인증 요청을 프록시합니다.
 * 백엔드에서 Room 접근 권한을 검증하고 Liveblocks 세션 토큰을 반환합니다.
 */

import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/utils/logger";
import { API_CONFIG } from "@/lib/constants/config";

const log = createLogger("Liveblocks Auth");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { room } = body;

    if (!room) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }

    // 프론트엔드에서 전달받은 인증 토큰 가져오기
    const authHeader = request.headers.get("authorization");
    const cookieHeader = request.headers.get("cookie");

    log.debug("Room:", room);
    log.debug("Auth header present:", !!authHeader);
    log.debug("Auth header:", authHeader?.substring(0, 30) + "...");

    // Backend API URL (server-side, ends with /api)
    // 직접 환경변수 읽기 (런타임에서 최신값 사용)
    // 로컬 개발: http://localhost:4000/api, Docker: http://backend:4000/api
    const apiUrl = process.env.INTERNAL_API_URL || API_CONFIG.INTERNAL_URL || "http://localhost:4000/api";
    const targetUrl = `${apiUrl}/liveblocks/auth`;

    log.debug("INTERNAL_API_URL env:", process.env.INTERNAL_API_URL);
    log.debug("API_CONFIG.INTERNAL_URL:", API_CONFIG.INTERNAL_URL);
    log.debug("Target URL:", targetUrl);

    // Endpoint matches root.controller.ts liveblocksAuth link: /liveblocks/auth
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader && { Authorization: authHeader }),
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
      body: JSON.stringify({ room }),
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error("Backend error:", response.status, errorText);
      return NextResponse.json(
        { error: "Authentication failed", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    log.info("Auth success for room:", room);
    return NextResponse.json(data);
  } catch (error) {
    log.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
