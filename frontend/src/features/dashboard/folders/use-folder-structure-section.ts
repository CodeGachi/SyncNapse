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

  // Find the "Root" folder (special system folder with name "Root" and parentId null)
  const rootFolder = folders.find((f) => f.name === "Root" && f.parentId === null);

  // Select Folder Sub Folders
  const subFolders = folders.filter((folder) => {
    if (selectedFolderId === null) {
      // At the root level, show folders that have parentId === null (excluding "Root")
      // OR folders that have the "Root" folder as parent
      if (rootFolder) {
        return (folder.parentId === null && folder.id !== rootFolder.id) || (folder.parentId === rootFolder.id);
      }
      return folder.parentId === null;
    } else {
      return folder.parentId === selectedFolderId;
    }
  });

  // Folder Path (breadcrumb) - exclude "Root" folder from the path
  const getFolderPath = (): Folder[] => {
    if (selectedFolderId === null) return [];

    const path: Folder[] = [];
    let currentId: string | null = selectedFolderId;

    while (currentId !== null) {
      const folder = folders.find((f) => f.id === currentId);
      if (!folder) break;
      
      // Skip "Root" folder in the path (don't add it to breadcrumb)
      if (!(folder.name === "Root" && folder.parentId === null)) {
        path.unshift(folder);
      }
      
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
    rootFolder, // Return rootFolder so components can use it for queries
  };
}
