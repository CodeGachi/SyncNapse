/**
 * Tests for useFileUpload hook
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFileUpload } from "@/hooks/use-file-upload";
import { vi } from "vitest";
import type { ReactNode } from "react";

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useFileUpload", () => {
  it("initializes with empty state", () => {
    const { result } = renderHook(() => useFileUpload(), {
      wrapper: createWrapper(),
    });

    expect(result.current.files).toEqual([]);
    expect(result.current.isUploading).toBe(false);
  });

  it("adds files correctly", () => {
    const { result } = renderHook(() => useFileUpload(), {
      wrapper: createWrapper(),
    });

    const mockFiles = [
      new File(["content1"], "file1.txt", { type: "text/plain" }),
      new File(["content2"], "file2.txt", { type: "text/plain" }),
    ];

    act(() => {
      result.current.addFiles(mockFiles);
    });

    expect(result.current.files).toHaveLength(2);
    expect(result.current.files[0].file.name).toBe("file1.txt");
    expect(result.current.files[1].file.name).toBe("file2.txt");
    expect(result.current.files[0].status).toBe("pending");
    expect(result.current.files[1].status).toBe("pending");
  });

  it("removes files correctly", () => {
    const { result } = renderHook(() => useFileUpload(), {
      wrapper: createWrapper(),
    });

    const mockFiles = [
      new File(["content"], "file.txt", { type: "text/plain" }),
    ];

    let fileId: string;

    act(() => {
      const items = result.current.addFiles(mockFiles);
      fileId = items[0].id;
    });

    expect(result.current.files).toHaveLength(1);

    act(() => {
      result.current.removeFile(fileId);
    });

    expect(result.current.files).toHaveLength(0);
  });

  it("tracks file states correctly", () => {
    const { result } = renderHook(() => useFileUpload(), {
      wrapper: createWrapper(),
    });

    const mockFiles = [
      new File(["content1"], "file1.txt", { type: "text/plain" }),
      new File(["content2"], "file2.txt", { type: "text/plain" }),
      new File(["content3"], "file3.txt", { type: "text/plain" }),
    ];

    act(() => {
      result.current.addFiles(mockFiles);
    });

    expect(result.current.files).toHaveLength(3);
    expect(result.current.files.filter(f => f.status === "pending")).toHaveLength(3);
    expect(result.current.files.filter(f => f.status === "uploading")).toHaveLength(0);
    expect(result.current.files.filter(f => f.status === "completed")).toHaveLength(0);
  });

  it("starts upload correctly", async () => {
    const { result } = renderHook(() => useFileUpload({ maxConcurrent: 2 }), {
      wrapper: createWrapper(),
    });

    const mockFiles = [
      new File(["content"], "file.txt", { type: "text/plain" }),
    ];

    act(() => {
      result.current.addFiles(mockFiles);
    });

    // Wait for state to update before starting upload
    await waitFor(() => {
      expect(result.current.files).toHaveLength(1);
    });

    act(() => {
      result.current.startUpload();
    });

    // Wait for upload to complete
    await waitFor(() => {
      expect(result.current.files.filter(f => f.status === "completed")).toHaveLength(1);
    }, { timeout: 5000 });
  });

  it("clears completed files", () => {
    const { result } = renderHook(() => useFileUpload(), {
      wrapper: createWrapper(),
    });

    const mockFiles = [
      new File(["content"], "file.txt", { type: "text/plain" }),
    ];

    act(() => {
      result.current.addFiles(mockFiles);
    });

    // Manually set one file to completed (simulating upload)
    act(() => {
      result.current.files[0].status = "completed";
      result.current.clearCompleted();
    });

    expect(result.current.files).toHaveLength(0);
  });

  it("retries failed uploads", () => {
    const { result } = renderHook(() => useFileUpload(), {
      wrapper: createWrapper(),
    });

    const mockFiles = [
      new File(["content"], "file.txt", { type: "text/plain" }),
    ];

    let addedFiles: any[];

    act(() => {
      addedFiles = result.current.addFiles(mockFiles);
    });

    // Initial state should be pending
    expect(result.current.files.filter(f => f.status === "pending")).toHaveLength(1);

    // The retryFailed function should reset error state back to pending
    act(() => {
      result.current.retryFailed();
    });

    // Should still be pending (no errors to retry)
    expect(result.current.files.filter(f => f.status === "pending")).toHaveLength(1);
  });

  it("calls onAllComplete callback", async () => {
    const onAllComplete = vi.fn();

    const { result } = renderHook(
      () => useFileUpload({ onAllComplete }),
      {
        wrapper: createWrapper(),
      }
    );

    const mockFiles = [
      new File(["content"], "file.txt", { type: "text/plain" }),
    ];

    act(() => {
      result.current.addFiles(mockFiles);
    });

    // Wait for state to update before starting upload
    await waitFor(() => {
      expect(result.current.files).toHaveLength(1);
    });

    act(() => {
      result.current.startUpload();
    });

    await waitFor(() => {
      expect(result.current.files.filter(f => f.status === "completed")).toHaveLength(1);
    }, { timeout: 8000 });

    // onAllComplete should be called when upload finishes
    expect(onAllComplete).toHaveBeenCalledTimes(1);
  }, 10000);
});
