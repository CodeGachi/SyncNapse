/**
 * Short URL Redirect Page
 * Redirects short codes to the actual shared note page
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function ShortCodeRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const shortCode = (params?.shortCode as string) || '';
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function resolveAndRedirect() {
      if (!shortCode) return;
      
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
        const response = await fetch(`${apiUrl}/short-urls/${shortCode}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.noteId) {
            router.replace(`/shared/${data.noteId}`);
            return;
          }
        }
        
        setError('링크를 찾을 수 없습니다');
      } catch (err) {
        console.error('Failed to resolve short URL:', err);
        setError('링크를 확인하는 중 오류가 발생했습니다');
      } finally {
        setIsLoading(false);
      }
    }

    resolveAndRedirect();
  }, [shortCode, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-base p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
          <p className="text-foreground-secondary">링크 확인 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-base p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-status-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-status-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            {error}
          </h1>
          <p className="text-foreground-secondary text-sm mb-6">
            이 링크가 유효하지 않거나 만료되었을 수 있습니다.
          </p>
          <p className="text-xs text-foreground-tertiary mb-4">
            코드: {shortCode}
          </p>
          <a 
            href="/"
            className="inline-block px-6 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors"
          >
            홈으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  return null;
}
