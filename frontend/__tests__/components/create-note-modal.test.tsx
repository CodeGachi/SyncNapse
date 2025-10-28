/**
 * NoteSettingsModal 파일 업로드 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NoteSettingsModal } from "@/components/dashboard/create-note-modal";
import { useNoteSettingsStore } from "@/stores";

// 테스트용 QueryClient 생성 함수
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

// Wrapper 컴포넌트
function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe("NoteSettingsModal - File Upload", () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Zustand store 초기화
    useNoteSettingsStore.getState().reset();
  });

  afterEach(() => {
    // 테스트 후 정리
    useNoteSettingsStore.getState().reset();
  });

  it("파일 선택 시 uploadedFiles에 추가됨", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(
        <NoteSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
        { wrapper: Wrapper }
      );
    });

    // 초기 상태 확인
    expect(useNoteSettingsStore.getState().uploadedFiles).toHaveLength(0);

    // 파일 input 찾기 (type="file"인 input)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    // 테스트 파일 생성
    const file = new File(["test content"], "test.pdf", { type: "application/pdf" });

    // 파일 업로드
    await act(async () => {
      await user.upload(fileInput, file);
    });

    // Zustand store에 파일이 추가되었는지 확인
    await waitFor(() => {
      const uploadedFiles = useNoteSettingsStore.getState().uploadedFiles;
      expect(uploadedFiles.length).toBeGreaterThan(0);
    }, { timeout: 5000 });

    // 화면에 파일 이름이 표시되는지 확인 (약간의 딜레이 후)
    await waitFor(() => {
      expect(screen.getByText("test.pdf")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("파일 업로드 시 자동으로 업로드 시작", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(
        <NoteSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
        { wrapper: Wrapper }
      );
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["content"], "test.pdf", { type: "application/pdf" });

    await act(async () => {
      await user.upload(fileInput, file);
    });

    // 파일이 추가되었는지 확인
    await waitFor(() => {
      expect(screen.getByText("test.pdf")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("여러 파일을 동시에 업로드할 수 있음", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(
        <NoteSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
        { wrapper: Wrapper }
      );
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [
      new File(["content1"], "test1.pdf", { type: "application/pdf" }),
      new File(["content2"], "test2.pdf", { type: "application/pdf" }),
      new File(["content3"], "test3.pdf", { type: "application/pdf" }),
    ];

    await act(async () => {
      await user.upload(fileInput, files);
    });

    // 모든 파일이 표시되는지 확인
    await waitFor(() => {
      expect(screen.getByText("test1.pdf")).toBeInTheDocument();
      expect(screen.getByText("test2.pdf")).toBeInTheDocument();
      expect(screen.getByText("test3.pdf")).toBeInTheDocument();
    });

    // 업로드된 파일 개수 표시 확인
    expect(screen.getByText(/업로드된 파일 \(3개\)/i)).toBeInTheDocument();
  });

  it("파일 삭제 버튼이 작동함", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(
        <NoteSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
        { wrapper: Wrapper }
      );
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["content"], "test.pdf", { type: "application/pdf" });

    await act(async () => {
      await user.upload(fileInput, file);
    });

    // 파일이 추가되었는지 확인
    await waitFor(() => {
      expect(screen.getByText("test.pdf")).toBeInTheDocument();
    });

    // 삭제 버튼 찾기 (X 버튼)
    const deleteButtons = screen.getAllByTitle("목록에서 제거");
    expect(deleteButtons.length).toBeGreaterThan(0);

    // 삭제 버튼 클릭
    await act(async () => {
      await user.click(deleteButtons[0]);
    });

    // 파일이 삭제되었는지 확인
    await waitFor(() => {
      expect(screen.queryByText("test.pdf")).not.toBeInTheDocument();
    });

    // 빈 상태 메시지 확인
    expect(screen.getByText("업로드된 파일이 없습니다")).toBeInTheDocument();
  });

  it("파일이 업로드 목록에 표시됨", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(
        <NoteSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
        { wrapper: Wrapper }
      );
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["content"], "test.pdf", { type: "application/pdf" });

    await act(async () => {
      await user.upload(fileInput, file);
    });

    // 파일이 업로드 목록에 추가되었는지 확인
    await waitFor(
      () => {
        expect(screen.getByText("test.pdf")).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("노트 생성 시 uploadedFiles의 파일들이 전달됨", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(
        <NoteSettingsModal
          isOpen={true}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
        />,
        { wrapper: Wrapper }
      );
    });

    // 제목 입력
    const titleInput = screen.getByPlaceholderText("노트 제목");
    await act(async () => {
      await user.type(titleInput, "테스트 노트");
    });

    // 파일 업로드
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["content"], "test.pdf", { type: "application/pdf" });
    await act(async () => {
      await user.upload(fileInput, file);
    });

    // 파일이 추가될 때까지 대기
    await waitFor(() => {
      expect(screen.getByText("test.pdf")).toBeInTheDocument();
    });

    // 노트 생성 버튼 클릭
    const submitButton = screen.getByText("노트 생성");
    await act(async () => {
      await user.click(submitButton);
    });

    // onSubmit이 호출되었는지 확인
    expect(mockOnSubmit).toHaveBeenCalled();

    // 전달된 데이터 확인
    const submittedData = mockOnSubmit.mock.calls[0][0];
    expect(submittedData.title).toBe("테스트 노트");
    expect(submittedData.files).toHaveLength(1);
    expect(submittedData.files[0].name).toBe("test.pdf");
  });
});
