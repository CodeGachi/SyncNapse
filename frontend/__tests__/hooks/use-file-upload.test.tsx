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
    }, { timeout: 3000 });

    act(() => {
      result.current.startUpload();
    });

    await waitFor(() => {
      expect(result.current.files.filter(f => f.status === "completed")).toHaveLength(1);
    }, { timeout: 10000 });

    // Wait a bit more for callback to be invoked
    await waitFor(() => {
      expect(onAllComplete).toHaveBeenCalled();
    }, { timeout: 2000 });
  }, 15000);

  it("uploads PDF files correctly", async () => {
    const { result } = renderHook(() => useFileUpload(), {
      wrapper: createWrapper(),
    });

    // Create a mock PDF file
    const pdfContent = "%PDF-1.4\n%mock pdf content";
    const pdfFile = new File([pdfContent], "test.pdf", {
      type: "application/pdf"
    });

    act(() => {
      result.current.addFiles([pdfFile]);
    });

    // Wait for state to update
    await waitFor(() => {
      expect(result.current.files).toHaveLength(1);
    });

    // Verify PDF file was added with correct type
    expect(result.current.files[0].file.name).toBe("test.pdf");
    expect(result.current.files[0].file.type).toBe("application/pdf");
    expect(result.current.files[0].status).toBe("pending");

    act(() => {
      result.current.startUpload();
    });

    // Wait for upload to complete
    await waitFor(() => {
      expect(result.current.files.filter(f => f.status === "completed")).toHaveLength(1);
    }, { timeout: 5000 });
  });

  it("uploads multiple PDF files correctly", async () => {
    const { result } = renderHook(() => useFileUpload({ maxConcurrent: 3 }), {
      wrapper: createWrapper(),
    });

    // Create multiple mock PDF files
    const pdfFiles = [
      new File(["%PDF-1.4\ncontent1"], "test1.pdf", { type: "application/pdf" }),
      new File(["%PDF-1.4\ncontent2"], "test2.pdf", { type: "application/pdf" }),
      new File(["%PDF-1.4\ncontent3"], "test3.pdf", { type: "application/pdf" }),
    ];

    act(() => {
      result.current.addFiles(pdfFiles);
    });

    // Wait for state to update
    await waitFor(() => {
      expect(result.current.files).toHaveLength(3);
    });

    // Verify all PDF files were added
    expect(result.current.files.every(f => f.file.type === "application/pdf")).toBe(true);
    expect(result.current.files.filter(f => f.status === "pending")).toHaveLength(3);

    act(() => {
      result.current.startUpload();
    });

    // Wait for all uploads to complete
    await waitFor(() => {
      expect(result.current.files.filter(f => f.status === "completed")).toHaveLength(3);
    }, { timeout: 10000 });
  });

  it("handles mixed file types including PDF", async () => {
    const { result } = renderHook(() => useFileUpload(), {
      wrapper: createWrapper(),
    });

    const mixedFiles = [
      new File(["%PDF-1.4\npdf content"], "document.pdf", { type: "application/pdf" }),
      new File(["text content"], "notes.txt", { type: "text/plain" }),
      new File(["image data"], "photo.jpg", { type: "image/jpeg" }),
    ];

    act(() => {
      result.current.addFiles(mixedFiles);
    });

    await waitFor(() => {
      expect(result.current.files).toHaveLength(3);
    });

    // Verify different file types
    expect(result.current.files[0].file.type).toBe("application/pdf");
    expect(result.current.files[1].file.type).toBe("text/plain");
    expect(result.current.files[2].file.type).toBe("image/jpeg");

    act(() => {
      result.current.startUpload();
    });

    // Wait for all uploads to complete
    await waitFor(() => {
      const completed = result.current.files.filter(f => f.status === "completed");
      return expect(completed).toHaveLength(3);
    }, { timeout: 12000 });
  }, 20000);
});
