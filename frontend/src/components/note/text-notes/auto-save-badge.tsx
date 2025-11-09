/**
 * AutoSave Status Badge Component */ 
"use client";

import type { AutoSaveStatus } from "@/lib/types";
import { useAutoSaveBadge } from "@/features/note/text-notes/use-auto-save-badge"; // ✅ text-notes

interface AutoSaveBadgeProps {
  status: AutoSaveStatus;
  lastSavedAt: string | null;
}

export function AutoSaveBadge({ status, lastSavedAt }: AutoSaveBadgeProps) {
  const { getStatusInfo, formatLastSaved } = useAutoSaveBadge(
    status,
    lastSavedAt
  );

  const { text, color, icon } = getStatusInfo();
  const lastSavedText = formatLastSaved();

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${color} px-3 py-1 rounded-full flex items-center gap-2`}
      >
        {icon}
        <span className="text-white text-xs font-medium">{text}</span>
      </div>
      {lastSavedText && status === "saved" && (
        <span className="text-gray-400 text-xs">{lastSavedText}</span>
      )}
    </div>
  );
}
