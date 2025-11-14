/**
 * Dashboard Context Provider
 * Shares selectedFolderId state across dashboard pages
 * Persists selected folder to localStorage
 */

"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface DashboardContextType {
  selectedFolderId: string | null;
  setSelectedFolderId: (id: string | null) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined
);

const STORAGE_KEY = "dashboard_selected_folder_id";

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [selectedFolderId, setSelectedFolderIdState] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Restore selected folder from localStorage on mount
  useEffect(() => {
    console.log('[DashboardProvider] Initializing...');
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      console.log('[DashboardProvider] Saved folder ID:', saved);
      if (saved !== null) {
        setSelectedFolderIdState(saved === "null" ? null : saved);
      }
    } catch (error) {
      console.error("Failed to load selected folder from localStorage:", error);
    } finally {
      setIsInitialized(true);
      console.log('[DashboardProvider] Initialization complete');
    }
  }, []);

  // Save selected folder to localStorage when it changes
  const setSelectedFolderId = (id: string | null) => {
    setSelectedFolderIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id === null ? "null" : id);
    } catch (error) {
      console.error("Failed to save selected folder to localStorage:", error);
    }
  };

  // Show loading indicator while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1E1E1E]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-400">대시보드 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardContext.Provider value={{ selectedFolderId, setSelectedFolderId }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error(
      "useDashboardContext must be used within a DashboardProvider"
    );
  }
  return context;
}
