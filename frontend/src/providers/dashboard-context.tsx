/**
 * Dashboard Context Provider
 * Shares selectedFolderId state across dashboard pages
 * Persists selected folder to localStorage
 */

"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getAllFolders, createFolder as createFolderInDB, saveFolder } from "@/lib/db/folders";
import { getAuthHeaders } from "@/lib/api/client";
import type { DBFolder } from "@/lib/db/folders";

interface DashboardContextType {
  selectedFolderId: string | null;
  setSelectedFolderId: (id: string | null) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(
  undefined
);

const STORAGE_KEY = "dashboard_selected_folder_id";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [selectedFolderId, setSelectedFolderIdState] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Restore selected folder from localStorage on mount, or default to Root folder
  useEffect(() => {
    console.log('[DashboardProvider] Initializing...');

    const initializeFolder = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        console.log('[DashboardProvider] Saved folder ID:', saved);

        if (saved !== null && saved !== "null") {
          // Use saved folder if exists
          setSelectedFolderIdState(saved);
        } else {
          // First time: Ensure Root folder exists on server and locally
          await ensureRootFolder();

          // Find Root folder and set as default
          const folders = await getAllFolders();
          const rootFolder = folders.find(f => f.name === "Root" && f.parentId === null);

          if (rootFolder) {
            console.log('[DashboardProvider] Setting Root folder as default:', rootFolder.id);
            setSelectedFolderIdState(rootFolder.id);
            localStorage.setItem(STORAGE_KEY, rootFolder.id);
          } else {
            console.log('[DashboardProvider] Root folder not found after creation attempt');
            setSelectedFolderIdState(null);
          }
        }
      } catch (error) {
        console.error("Failed to load selected folder from localStorage:", error);
      } finally {
        setIsInitialized(true);
        console.log('[DashboardProvider] Initialization complete');
      }
    };

    initializeFolder();
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

  /**
   * Ensure Root folder exists on both server and locally
   */
  async function ensureRootFolder() {
    try {
      console.log('[DashboardProvider] Ensuring Root folder exists...');

      // 1. Check server for Root folder
      const res = await fetch(`${API_BASE_URL}/api/folders`, {
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (!res.ok) {
        console.warn('[DashboardProvider] Failed to fetch folders from server:', res.status);
        return;
      }

      const serverFolders = await res.json();
      const serverHasRoot = serverFolders.some((f: any) => f.name === "Root" && f.parent_id === null);

      if (serverHasRoot) {
        console.log('[DashboardProvider] Root folder exists on server');

        // Sync to local if not exists (with same ID from server!)
        const localFolders = await getAllFolders();
        const serverRoot = serverFolders.find((f: any) => f.name === "Root" && f.parent_id === null);
        const localRoot = localFolders.find(f => f.name === "Root" && f.parentId === null);

        if (!localRoot && serverRoot) {
          // 서버 Root 폴더를 동일한 ID로 로컬에 저장
          const dbFolder: DBFolder = {
            id: serverRoot.id,
            name: serverRoot.name,
            parentId: null,
            createdAt: new Date(serverRoot.created_at || Date.now()),
            updatedAt: new Date(serverRoot.updated_at || Date.now()),
            isDeleted: false,
          };
          await saveFolder(dbFolder);
          console.log('[DashboardProvider] Root folder synced from server to local with ID:', serverRoot.id);
        } else if (localRoot && serverRoot && localRoot.id !== serverRoot.id) {
          // 로컬 Root ID가 서버와 다른 경우 → 서버 ID로 교체
          console.log('[DashboardProvider] Local Root ID mismatch, syncing with server ID');
          const { permanentlyDeleteFolder } = await import('@/lib/db/folders');
          await permanentlyDeleteFolder(localRoot.id);
          const dbFolder: DBFolder = {
            id: serverRoot.id,
            name: serverRoot.name,
            parentId: null,
            createdAt: new Date(serverRoot.created_at || Date.now()),
            updatedAt: new Date(serverRoot.updated_at || Date.now()),
            isDeleted: false,
          };
          await saveFolder(dbFolder);
          console.log('[DashboardProvider] Root folder replaced with server ID:', serverRoot.id);
        }
        return;
      }

      // 2. Root folder doesn't exist on server - create dummy note to trigger Root creation
      console.log('[DashboardProvider] Root folder missing on server, creating via dummy note...');

      try {
        // 더미 노트 생성 (백엔드가 자동으로 Root 폴더 생성)
        const formData = new FormData();
        formData.append("title", "__DUMMY_NOTE_FOR_ROOT__");
        formData.append("folder_id", ""); // 빈 값으로 보내면 백엔드가 Root 폴더에 생성
        formData.append("type", "student");

        const createNoteRes = await fetch(`${API_BASE_URL}/api/notes`, {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
          },
          credentials: "include",
          body: formData,
        });

        if (createNoteRes.ok) {
          const dummyNote = await createNoteRes.json();
          console.log('[DashboardProvider] Dummy note created:', dummyNote.id);

          // 더미 노트 삭제
          const deleteRes = await fetch(`${API_BASE_URL}/api/notes/${dummyNote.id}`, {
            method: "DELETE",
            headers: {
              ...getAuthHeaders(),
            },
            credentials: "include",
          });

          if (deleteRes.ok) {
            console.log('[DashboardProvider] Dummy note deleted');
          }

          // 서버에서 Root 폴더 다시 가져오기
          const refreshRes = await fetch(`${API_BASE_URL}/api/folders`, {
            credentials: "include",
            headers: {
              ...getAuthHeaders(),
            },
          });

          if (refreshRes.ok) {
            const refreshedFolders = await refreshRes.json();
            const serverRoot = refreshedFolders.find((f: any) => f.name === "Root" && f.parent_id === null);

            if (serverRoot) {
              // 서버 Root 폴더를 로컬에 저장
              const dbFolder: DBFolder = {
                id: serverRoot.id,
                name: serverRoot.name,
                parentId: null,
                createdAt: new Date(serverRoot.created_at || Date.now()),
                updatedAt: new Date(serverRoot.updated_at || Date.now()),
                isDeleted: false,
              };
              await saveFolder(dbFolder);
              console.log('[DashboardProvider] ✅ Root folder synced from server:', serverRoot.id);
            }
          }
        } else {
          console.error('[DashboardProvider] Failed to create dummy note:', createNoteRes.status);
        }
      } catch (error) {
        console.error('[DashboardProvider] Error creating Root folder via dummy note:', error);
      }
    } catch (error) {
      console.error('[DashboardProvider] Error ensuring Root folder:', error);
    }
  }

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
