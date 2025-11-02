/**
 * SidebarIcons Hook
* Screen Size Detect and When Management */
import { useState, useEffect } from "react";

export function useSidebarIcons() {
  const [isVisible, setIsVisible] = useState(true);

  // Screen Size Detect
  useEffect(() => {
    const handleResize = () => {
      const minWidth = 1200;
      setIsVisible(window.innerWidth >= minWidth);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return {
    isVisible,
  };
}
