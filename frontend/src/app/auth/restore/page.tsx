'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { restoreAccount, permanentDeleteAccount } from '@/lib/api/auth.api';
import Link from 'next/link';

function RestoreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-xl font-bold text-gray-900 mb-4">유효하지 않은 접근입니다</h1>
          <p className="mb-6 text-gray-600">복구 토큰이 제공되지 않았습니다.</p>
          <Link 
            href="/login" 
            className="inline-block w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            로그인 페이지로 이동
          </Link>
        </div>
      </div>
    );
  }

  const handleRestore = async () => {
    try {
      setStatus('loading');
      await restoreAccount(token);
      setStatus('success');
      // 2초 후 메인으로 이동
      setTimeout(() => {
        // 로그인 성공 시 대시보드로 이동. 
        // 백엔드가 복구 시 토큰을 새로 발급해주거나 세션을 유지해주는지에 따라 다르지만,
        // 현재 백엔드 로직상 restoreUser는 단순히 DB 업데이트만 함.
        // 따라서 복구 후 다시 로그인을 하거나, 아니면 이미 로그인 세션이 살아있어야 함.
        // 하지만 restore 토큰으로 온 경우 로그인이 안 된 상태일 수 있음.
        // 안전하게 로그인 페이지로 보내는 것이 좋음 (또는 자동 로그인 처리가 필요함).
        // 사용자 경험상 "복구되었습니다. 다시 로그인해주세요"가 명확함.
        router.push('/login?restored=true'); 
      }, 2000);
    } catch (error) {
      setStatus('error');
      setErrorMessage('계정 복구에 실패했습니다. 토큰이 만료되었거나 유효하지 않습니다.');
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말로 계정을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며 모든 데이터가 즉시 삭제됩니다.')) {
      return;
    }
    try {
      setStatus('loading');
      await permanentDeleteAccount(token);
      alert('계정이 영구 삭제되었습니다.');
      router.push('/login');
    } catch (error) {
      setStatus('error');
      setErrorMessage('계정 삭제에 실패했습니다.');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">계정 복구 완료!</h1>
          <p className="text-gray-600">잠시 후 로그인 페이지로 이동합니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">삭제 요청된 계정입니다</h1>
          <p className="text-gray-600">
            이 계정은 현재 삭제 대기 상태입니다.<br/>
            (데이터 보관 기간: 30일)
          </p>
          <p className="mt-2 text-sm text-gray-500">
            계정을 복구하거나 영구적으로 삭제할 수 있습니다.
          </p>
        </div>

        {status === 'error' && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
            {errorMessage}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleRestore}
            disabled={status === 'loading'}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 shadow-sm"
          >
            {status === 'loading' ? '처리 중...' : '계정 복구하기'}
          </button>
          
          <button
            onClick={handleDelete}
            disabled={status === 'loading'}
            className="w-full py-3 px-4 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            영구 삭제하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RestorePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RestoreContent />
    </Suspense>
  );
}

