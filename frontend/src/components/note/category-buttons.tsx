/**
 * 카테고리 버튼 UI 컴포넌트
 */

"use client";

interface CategoryButtonsProps {
  activeCategories: string[];
  onCategoryToggle: (category: string) => void;
  onNotesToggle?: () => void;
  isNotesOpen?: boolean;
  onFilesToggle?: () => void;
  isFilesOpen?: boolean;
}

export function CategoryButtons({ activeCategories, onCategoryToggle, onNotesToggle, isNotesOpen = false, onFilesToggle, isFilesOpen = false }: CategoryButtonsProps) {
  const categories = ["Notes", "tags", "files", "etc."];

  return (
    <div className="flex items-center justify-center gap-2.5 w-[424px]">
      {categories.map((category) => {
        const isActive =
          category === "Notes" ? isNotesOpen :
          category === "files" ? isFilesOpen :
          activeCategories.includes(category);

        const handleClick =
          category === "Notes" && onNotesToggle ? onNotesToggle :
          category === "files" && onFilesToggle ? onFilesToggle :
          () => onCategoryToggle(category);

        return (
          <button
            key={category}
            onClick={handleClick}
            className={`${
              isActive ? "bg-[#2f2f2f] ring-2 ring-white" : "bg-[#2f2f2f] border border-white"
            } h-[24px] px-5 rounded-[10px] cursor-pointer hover:bg-[#3f3f3f] transition-colors`}
          >
            <span className="text-white text-[12px] font-bold">{category}</span>
          </button>
        );
      })}
    </div>
  );
}
