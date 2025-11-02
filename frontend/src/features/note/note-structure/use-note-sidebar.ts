/**
 * NoteSidebar Hook
 * isNavigating status and beforeunload warning management
 */
import { useState, useEffect } from "react";

interface UseNoteSidebarProps {
  autoSaveStatus: string;
}

export function useNoteSidebar({ autoSaveStatus }: UseNoteSidebarProps) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  // Show warning when browser closes during save
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (autoSaveStatus === "saving") {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [autoSaveStatus]);

  const handleLogoClick = (autoSaveStatus: string, router: any) => {
    // Sav Warn Display
    if (autoSaveStatus === "saving") {
      setShowWarning(true);
      return false;
    }

    // Save Complete after Dashboardwith
    setIsNavigating(true);
    router.push("/dashboard/main");
    return true;
  };

  return {
    isNavigating,
    showWarning,
    setShowWarning,
    handleLogoClick,
  };
}
