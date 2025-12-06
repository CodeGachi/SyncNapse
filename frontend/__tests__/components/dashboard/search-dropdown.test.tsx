/**
 * SearchDropdown 컴포넌트 테스트
 * 검색 결과 드롭다운
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchDropdown } from "@/components/dashboard/search-dropdown";
import * as dashboardFeatures from "@/features/dashboard";

// useSearchDropdown mock
vi.mock("@/features/dashboard", () => ({
  useSearchDropdown: vi.fn(() => ({
    visibleCounts: { notes: 3, files: 3, segments: 3 },
    totalResults: 5,
    showMore: vi.fn(),
    handleNoteClick: vi.fn(),
    handleFileClick: vi.fn(),
    handleSegmentClick: vi.fn(),
  })),
  formatTime: vi.fn((time: number) => `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, "0")}`),
  highlightText: vi.fn((text: string) => text),
}));

vi.mock("@/lib/utils/decode-filename", () => ({
  decodeFilename: vi.fn((name: string) => name),
}));

const mockResults = {
  notes: [
    { id: "note-1", type: "note" as const, title: "테스트 노트", updatedAt: "2024-01-01" },
    { id: "note-2", type: "note" as const, title: "두 번째 노트", updatedAt: "2024-01-02" },
  ],
  files: [
    { id: "file-1", type: "file" as const, title: "test.pdf", noteTitle: "테스트 노트", noteId: "note-1", updatedAt: "2024-01-01" },
  ],
  segments: [
    { id: "seg-1", type: "segment" as const, text: "안녕하세요", startTime: 10, endTime: 15, sessionTitle: "녹음 1", noteTitle: "테스트", noteId: "note-1" },
  ],
};

describe("SearchDropdown", () => {
  const defaultProps = {
    results: mockResults,
    query: "테스트",
    isLoading: false,
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dashboardFeatures.useSearchDropdown).mockReturnValue({
      visibleCounts: { notes: 3, files: 3, segments: 3 },
      totalResults: 5,
      showMore: vi.fn(),
      handleNoteClick: vi.fn(),
      handleFileClick: vi.fn(),
      handleSegmentClick: vi.fn(),
    });
  });

  describe("렌더링", () => {
    it("isOpen=false일 때 렌더링 안함", () => {
      render(<SearchDropdown {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("노트")).not.toBeInTheDocument();
    });

    it("isOpen=true일 때 렌더링", () => {
      const { container } = render(<SearchDropdown {...defaultProps} />);

      // 드롭다운 컨테이너가 렌더링되는지 확인
      expect(container.querySelector(".absolute")).toBeInTheDocument();
    });
  });

  describe("로딩 상태", () => {
    it("로딩 중일 때 스피너 표시", () => {
      render(<SearchDropdown {...defaultProps} isLoading={true} />);

      expect(screen.getByText("검색 중...")).toBeInTheDocument();
    });
  });

  describe("검색 결과 없음", () => {
    it("결과 없을 때 메시지 표시", () => {
      const emptyResults = { notes: [], files: [], segments: [] };

      vi.mocked(dashboardFeatures.useSearchDropdown).mockReturnValue({
        visibleCounts: { notes: 3, files: 3, segments: 3 },
        totalResults: 0,
        showMore: vi.fn(),
        handleNoteClick: vi.fn(),
        handleFileClick: vi.fn(),
        handleSegmentClick: vi.fn(),
      });

      render(<SearchDropdown {...defaultProps} results={emptyResults} />);

      expect(screen.getByText("검색 결과가 없습니다")).toBeInTheDocument();
    });
  });

  describe("검색 결과 섹션", () => {
    it("노트 섹션 표시", () => {
      render(<SearchDropdown {...defaultProps} />);

      expect(screen.getByText(/노트 \(2\)/)).toBeInTheDocument();
    });

    it("파일 섹션 표시", () => {
      render(<SearchDropdown {...defaultProps} />);

      expect(screen.getByText(/파일 \(1\)/)).toBeInTheDocument();
    });

    it("음성 섹션 표시", () => {
      render(<SearchDropdown {...defaultProps} />);

      expect(screen.getByText(/음성 \(1\)/)).toBeInTheDocument();
    });
  });

  describe("결과 아이템", () => {
    it("노트 결과 아이템 렌더링", () => {
      render(<SearchDropdown {...defaultProps} />);

      expect(screen.getByText("테스트 노트")).toBeInTheDocument();
    });

    it("파일 결과 아이템 렌더링", () => {
      render(<SearchDropdown {...defaultProps} />);

      expect(screen.getByText("test.pdf")).toBeInTheDocument();
    });

    it("세그먼트 결과 아이템 렌더링", () => {
      render(<SearchDropdown {...defaultProps} />);

      expect(screen.getByText(/"안녕하세요"/)).toBeInTheDocument();
    });
  });

  describe("카테고리 배지", () => {
    it("노트 배지", () => {
      render(<SearchDropdown {...defaultProps} />);

      const badges = screen.getAllByText("노트");
      expect(badges.length).toBeGreaterThan(0);
    });

    it("파일 배지", () => {
      render(<SearchDropdown {...defaultProps} />);

      expect(screen.getByText("파일", { selector: "span" })).toBeInTheDocument();
    });

    it("음성 배지", () => {
      render(<SearchDropdown {...defaultProps} />);

      expect(screen.getByText("음성", { selector: "span" })).toBeInTheDocument();
    });
  });
});
