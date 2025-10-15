"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/common/button";

export function LoginSection() {
  const router = useRouter();

  const handleLogin = () => {
    // TODO: 실제 로그인 로직 구현
    console.log("로그인 처리");
    // 로그인 성공 후 대시보드로 이동
    router.push("/dashboard");
  };

  return (
    <div className="flex flex-col gap-4 items-center">
      <Button variant="primary" size="lg" onClick={handleLogin}>
        로그인
      </Button>

      <div className="text-gray-500 text-sm">
        AI 기반 필기 정리와 학습 도구를 경험하세요
      </div>
    </div>
  );
}
