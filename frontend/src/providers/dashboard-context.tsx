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
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        setSelectedFolderIdState(saved === "null" ? null : saved);
      }
    } catch (error) {
      console.error("Failed to load selected folder from localStorage:", error);
    } finally {
      setIsInitialized(true);
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

  // Don't render until we've restored from localStorage
  if (!isInitialized) {
    return null;
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
