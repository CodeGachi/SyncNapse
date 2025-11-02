/**
 * NoteLayoutWrapper Hook
 * isWideScreen, resize, auto-collapse with 
*/
import { useEffect, useState } from "react";

interface UseNoteLayoutWrapperProps {
  isExpanded: boolean;
  toggleExpand: () => void;
}

export function useNoteLayoutWrapper({ isExpanded, toggleExpand }: UseNoteLayoutWrapperProps) {
  const [isWideScreen, setIsWideScreen] = useState(true);

  // Screen Size Detect Auto with Side Panel Collapse
  useEffect(() => {
    const handleResize = () => {
      const minWidth = 1200;
      const isWide = window.innerWidth >= minWidth;
      setIsWideScreen(isWide);

      if (!isWide && isExpanded) {
        // Screen 작아 Auto with Collapse
        toggleExpand();
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isExpanded, toggleExpand]);

  // Margin calculation
  const marginClass = isExpanded
    ? "mr-[500px]"
    : isWideScreen
    ? "mr-[60px]"
    : "mr-0";

  return {
    isWideScreen,
    marginClass,
  };
}
