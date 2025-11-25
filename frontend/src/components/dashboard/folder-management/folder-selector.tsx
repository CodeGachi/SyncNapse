import React, { useState } from "react";
import type { FolderTreeNode } from "@/features/dashboard";

interface FolderSelectorProps {
    tree: FolderTreeNode[];
    selectedFolderId: string | null;
    onSelectFolder: (folderId: string | null) => void;
    excludeFolderId?: string; // 이동 시 자기 자신과 하위 폴더 제외용
    level?: number;
}

export function FolderSelector({
    tree,
    selectedFolderId,
    onSelectFolder,
    excludeFolderId,
    level = 0,
}: FolderSelectorProps) {
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    const toggleFolder = (folderId: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderId)) {
            newExpanded.delete(folderId);
        } else {
            newExpanded.add(folderId);
        }
        setExpandedFolders(newExpanded);
    };

    return (
        <ul className="space-y-1">
            {tree.map((node) => {
                // 제외할 폴더(자기 자신)인 경우 렌더링하지 않음
                if (excludeFolderId && node.folder.id === excludeFolderId) return null;

                const isExpanded = expandedFolders.has(node.folder.id);
                const isSelected = selectedFolderId === node.folder.id;
                const hasChildren = node.children.length > 0;

                return (
                    <li key={node.folder.id}>
                        <div
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${isSelected
                                    ? "bg-[#899649]/30 text-white ring-1 ring-[#899649]/50"
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                                }`}
                            style={{ paddingLeft: `${level * 16 + 12}px` }}
                            onClick={() => onSelectFolder(node.folder.id)}
                        >
                            {/* 확장/축소 아이콘 */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFolder(node.folder.id);
                                }}
                                className={`w-4 h-4 flex items-center justify-center transition-transform ${hasChildren ? "opacity-100" : "opacity-0"
                                    } ${isExpanded ? "rotate-90" : ""}`}
                            >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
                                </svg>
                            </button>

                            {/* 폴더 아이콘 */}
                            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                            </svg>

                            {/* 폴더 이름 */}
                            <span className="text-sm truncate">{node.folder.name}</span>
                        </div>

                        {/* 하위 폴더 */}
                        {isExpanded && hasChildren && (
                            <FolderSelector
                                tree={node.children}
                                selectedFolderId={selectedFolderId}
                                onSelectFolder={onSelectFolder}
                                excludeFolderId={excludeFolderId}
                                level={level + 1}
                            />
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
