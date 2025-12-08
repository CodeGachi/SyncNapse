import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

vi.mock("@/lib/api/services/transcription.api", () => ({
  getSessions: vi.fn().mockResolvedValue([]),
  deleteSession: vi.fn(),
}));

import { useRecordingList } from "@/features/note/recording/use-recording-list";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useRecordingList", () => {
  it("초기 상태", () => {
    const { result } = renderHook(() => useRecordingList(), { wrapper });
    expect(result.current.recordings).toEqual([]);
  });
});
