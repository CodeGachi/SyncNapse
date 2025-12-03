/**
 * 대시보드 컨텍스트 프로바이더
 * 대시보드 페이지 간 selectedFolderId 상태 공유
 * 선택된 폴더를 localStorage에 영속화
 */

"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createLogger } from "@/lib/utils/logger";

const log = createLogger("DashboardProvider");
import { getAllFolders, createFolder as createFolderInDB, saveFolder } from "@/lib/db/folders";
import { getAuthHeaders } from "@/lib/api/client";
import type { DBFolder } from "@/lib/db/folders";
import { LoadingScreen } from "@/components/common/loading-screen";

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
    log.debug('[DashboardProvider] Initializing...');

    const initializeFolder = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        log.debug('[DashboardProvider] Saved folder ID:', saved);

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
            log.debug('[DashboardProvider] Setting Root folder as default:', rootFolder.id);
            setSelectedFolderIdState(rootFolder.id);
            localStorage.setItem(STORAGE_KEY, rootFolder.id);
          } else {
            log.debug('[DashboardProvider] Root folder not found after creation attempt');
            setSelectedFolderIdState(null);
          }
        }
      } catch (error) {
        log.error("Failed to load selected folder from localStorage:", error);
      } finally {
        setIsInitialized(true);
        log.debug('[DashboardProvider] Initialization complete');
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
      log.error("Failed to save selected folder to localStorage:", error);
    }
  };

  /**
   * Ensure Root folder exists on both server and locally
   */
  async function ensureRootFolder() {
    try {
      log.debug('[DashboardProvider] Ensuring Root folder exists...');

      // 1. Check server for Root folder
      const res = await fetch(`${API_BASE_URL}/api/folders`, {
        credentials: "include",
        headers: {
          ...getAuthHeaders(),
        },
      });

      if (!res.ok) {
        log.warn('[DashboardProvider] Failed to fetch folders from server:', res.status);
        return;
      }

      const serverFolders = await res.json();
      const serverHasRoot = serverFolders.some((f: any) => f.name === "Root" && f.parent_id === null);

      if (serverHasRoot) {
        log.debug('[DashboardProvider] Root folder exists on server');

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
            createdAt: new Date(serverRoot.created_at || Date.now()).getTime(),
            updatedAt: new Date(serverRoot.updated_at || Date.now()).getTime(),
          };
          await saveFolder(dbFolder);
          log.debug('[DashboardProvider] Root folder synced from server to local with ID:', serverRoot.id);
        } else if (localRoot && serverRoot && localRoot.id !== serverRoot.id) {
          // 로컬 Root ID가 서버와 다른 경우 → 서버 ID로 교체
          log.debug('[DashboardProvider] Local Root ID mismatch, syncing with server ID');
          const { permanentlyDeleteFolder } = await import('@/lib/db/folders');
          await permanentlyDeleteFolder(localRoot.id);
          const dbFolder: DBFolder = {
            id: serverRoot.id,
            name: serverRoot.name,
            parentId: null,
            createdAt: new Date(serverRoot.created_at || Date.now()).getTime(),
            updatedAt: new Date(serverRoot.updated_at || Date.now()).getTime(),
          };
          await saveFolder(dbFolder);
          log.debug('[DashboardProvider] Root folder replaced with server ID:', serverRoot.id);
        }
        return;
      }

      // 2. Root folder doesn't exist on server - create dummy note to trigger Root creation
      log.debug('[DashboardProvider] Root folder missing on server, creating via dummy note...');

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
          log.debug('[DashboardProvider] Dummy note created:', dummyNote.id);

          // 더미 노트 삭제
          const deleteRes = await fetch(`${API_BASE_URL}/api/notes/${dummyNote.id}`, {
            method: "DELETE",
            headers: {
              ...getAuthHeaders(),
            },
            credentials: "include",
          });

          if (deleteRes.ok) {
            log.debug('[DashboardProvider] Dummy note deleted');
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
                createdAt: new Date(serverRoot.created_at || Date.now()).getTime(),
                updatedAt: new Date(serverRoot.updated_at || Date.now()).getTime(),
              };
              await saveFolder(dbFolder);
              log.debug('[DashboardProvider] Root folder synced from server:', serverRoot.id);
            }
          }
        } else {
          log.error('[DashboardProvider] Failed to create dummy note:', createNoteRes.status);
        }
      } catch (error) {
        log.error('[DashboardProvider] Error creating Root folder via dummy note:', error);
      }
    } catch (error) {
      log.error('[DashboardProvider] Error ensuring Root folder:', error);
    }
  }

  // Show loading indicator while initializing
  if (!isInitialized) {
    return <LoadingScreen fullScreen message="대시보드 로딩 중..." />;
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
