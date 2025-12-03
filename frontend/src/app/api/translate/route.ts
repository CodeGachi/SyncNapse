/**
 * DeepL Translation API Proxy
 * 브라우저 CORS 문제를 해결하기 위한 서버사이드 프록시
 */

import { NextRequest, NextResponse } from 'next/server';

const DEEPL_API_URL = 'https://api-free.deepl.com/v2';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_DEEPL_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { texts, targetLang, sourceLang } = body;

    if (!texts || !targetLang) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // DeepL API 요청 파라미터 구성
    const params = new URLSearchParams();

    // texts가 배열이면 각각 추가, 아니면 단일 텍스트로
    if (Array.isArray(texts)) {
      texts.forEach((text: string) => params.append('text', text));
    } else {
      params.append('text', texts);
    }

    params.append('target_lang', targetLang);

    if (sourceLang) {
      params.append('source_lang', sourceLang);
    }

    // DeepL API 호출
    const response = await fetch(`${DEEPL_API_URL}/translate`, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      const status = response.status;
      let errorMessage = '번역 실패';

      switch (status) {
        case 403:
          errorMessage = 'API 키가 유효하지 않습니다.';
          break;
        case 429:
          errorMessage = '요청이 너무 많습니다.';
          break;
        case 456:
          errorMessage = '월간 번역 한도를 초과했습니다.';
          break;
      }

      return NextResponse.json(
        { error: errorMessage, status },
        { status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[Translate API] Error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 사용량 조회
export async function GET() {
  try {
    const apiKey = process.env.NEXT_PUBLIC_DEEPL_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const response = await fetch(`${DEEPL_API_URL}/usage`, {
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: '사용량 조회 실패' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[Translate API] Usage error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
