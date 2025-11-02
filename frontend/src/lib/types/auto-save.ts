/**
 * Auto-save Types
 * Auto save Related Type */ /**
 * Auto save Status
 */
export type AutoSaveStatus = "saved" | "saving" | "error" | "idle";

/**
 * Auto save Status Information
 */
export interface AutoSaveState {
  status: AutoSaveStatus;
  lastSavedAt?: string;
  error?: string;
}
