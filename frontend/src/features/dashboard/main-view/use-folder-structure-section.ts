/**
 * FolderStructureSection Hook
 * Sub folder filter and folder path navigation
 */
import { useFolders } from "@/features/dashboard";
import type { Folder } from "@/lib/types";

interface UseFolderStructureSectionProps {
  selectedFolderId: string | null;
}

export function useFolderStructureSection({ selectedFolderId }: UseFolderStructureSectionProps) {
  const { folders } = useFolders();

  // Select Folder Sub Folders
  const subFolders = folders.filter((folder) => {
    if (selectedFolderId === null) {
      return folder.parentId === null;
    } else {
      return folder.parentId === selectedFolderId;
    }
  });

  // Folder Path (breadcrumb)
  const getFolderPath = (): Folder[] => {
    if (selectedFolderId === null) return [];

    const path: Folder[] = [];
    let currentId: string | null = selectedFolderId;

    while (currentId !== null) {
      const folder = folders.find((f) => f.id === currentId);
      if (!folder) break;
      path.unshift(folder);
      currentId = folder.parentId;
    }

    return path;
  };

  const folderPath = getFolderPath();

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return {
    subFolders,
    folderPath,
    formatDate,
  };
}
