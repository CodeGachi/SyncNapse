/**
 * Category Button UI Component */ 
"use client";

interface CategoryButtonsProps {
  activeCategories: string[];
  onCategoryToggle: (category: string) => void;
  onNotesToggle?: () => void;
  isNotesOpen?: boolean;
  onFilesToggle?: () => void;
  isFilesOpen?: boolean;
  onEtcToggle?: () => void;
  isEtcOpen?: boolean;
  onTagsToggle?: () => void;
  isTagsOpen?: boolean;
  onCollaborationToggle?: () => void;
  isCollaborationOpen?: boolean;
  isEducator?: boolean;
}

export function CategoryButtons({
  activeCategories,
  onCategoryToggle,
  onNotesToggle,
  isNotesOpen = false,
  onFilesToggle,
  isFilesOpen = false,
  onEtcToggle,
  isEtcOpen = false,
  onTagsToggle,
  isTagsOpen = false,
  onCollaborationToggle,
  isCollaborationOpen = false,
  isEducator = false,
}: CategoryButtonsProps) {
  // 교육자 노트일 때만 협업 버튼 표시
  const categories = isEducator ? ["Notes", "tags", "files", "etc.", "cooperation"] : ["Notes", "tags", "files", "etc."];

  return (
    <div className="flex items-center justify-center gap-2.5 w-[424px]">
      {categories.map((category) => {
        const isActive =
          category === "Notes" ? isNotesOpen :
          category === "tags" ? isTagsOpen :
          category === "files" ? isFilesOpen :
          category === "etc." ? isEtcOpen :
          category === "cooperation" ? isCollaborationOpen :
          activeCategories.includes(category);

        const handleClick =
          category === "Notes" && onNotesToggle ? onNotesToggle :
          category === "tags" && onTagsToggle ? onTagsToggle :
          category === "files" && onFilesToggle ? onFilesToggle :
          category === "etc." && onEtcToggle ? onEtcToggle :
          category === "cooperation" && onCollaborationToggle ? onCollaborationToggle :
          () => onCategoryToggle(category);

        const displayName =
          category === "cooperation" ? "협업" : category;

        return (
          <button
            key={category}
            onClick={handleClick}
            className={`${
              isActive ? "bg-[#2f2f2f] ring-2 ring-white" : "bg-[#2f2f2f] border border-white"
            } h-[24px] px-5 rounded-[10px] cursor-pointer hover:bg-[#3f3f3f] transition-colors`}
          >
            <span className="text-white text-[12px] font-bold">{displayName}</span>
          </button>
        );
      })}
    </div>
  );
}
