/**
 * 스크립트 패널 상태 관리 훅
 */

import { useState } from "react";

export function useScriptPanel() {
  const [isScriptOpen, setIsScriptOpen] = useState(false);

  const toggleScript = () => {
    setIsScriptOpen((prev) => !prev);
  };

  return {
    isScriptOpen,
    toggleScript,
  };
}
