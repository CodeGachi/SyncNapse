/**
 * FileUploadItem 컴포넌트 테스트
 * 파일 업로드 상태 표시 아이템
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileUploadItem, FileUploadItemProps } from "@/components/common/file-upload-item";

const defaultProps: FileUploadItemProps = {
  fileName: "test-file.pdf",
  fileSize: 1024 * 1024, // 1MB
  status: "pending",
  progress: 0,
  variant: "wide",
};

describe("FileUploadItem", () => {
  describe("Wide 레이아웃", () => {
    describe("기본 렌더링", () => {
      it("파일명 표시", () => {
        render(<FileUploadItem {...defaultProps} />);

        expect(screen.getByText("test-file.pdf")).toBeInTheDocument();
      });

      it("파일 크기 표시 (MB)", () => {
        render(<FileUploadItem {...defaultProps} />);

        expect(screen.getByText("1.0 MB")).toBeInTheDocument();
      });

      it("파일 크기 표시 (KB)", () => {
        render(<FileUploadItem {...defaultProps} fileSize={512 * 1024} />);

        expect(screen.getByText("512.0 KB")).toBeInTheDocument();
      });

      it("파일 크기 표시 (B)", () => {
        render(<FileUploadItem {...defaultProps} fileSize={500} />);

        expect(screen.getByText("500 B")).toBeInTheDocument();
      });
    });

    describe("상태별 표시", () => {
      it("pending: 대기 텍스트", () => {
        render(<FileUploadItem {...defaultProps} status="pending" />);

        expect(screen.getByText("대기")).toBeInTheDocument();
      });

      it("uploading: 진행률 표시", () => {
        render(<FileUploadItem {...defaultProps} status="uploading" progress={67} />);

        expect(screen.getByText("67%")).toBeInTheDocument();
      });

      it("completed: 완료 텍스트", () => {
        render(<FileUploadItem {...defaultProps} status="completed" progress={100} />);

        expect(screen.getByText("완료")).toBeInTheDocument();
      });

      it("error: 재시도 버튼", () => {
        render(<FileUploadItem {...defaultProps} status="error" />);

        expect(screen.getByText("재시도")).toBeInTheDocument();
      });

      it("error: 에러 메시지 표시", () => {
        render(
          <FileUploadItem
            {...defaultProps}
            status="error"
            error="업로드 실패"
          />
        );

        expect(screen.getByText("업로드 실패")).toBeInTheDocument();
      });
    });

    describe("버튼 동작", () => {
      it("삭제 버튼 클릭", () => {
        const handleRemove = vi.fn();
        render(<FileUploadItem {...defaultProps} onRemove={handleRemove} />);

        const removeButton = screen.getByTitle("삭제");
        fireEvent.click(removeButton);

        expect(handleRemove).toHaveBeenCalled();
      });

      it("재시도 버튼 클릭", () => {
        const handleRetry = vi.fn();
        render(
          <FileUploadItem
            {...defaultProps}
            status="error"
            onRetry={handleRetry}
          />
        );

        fireEvent.click(screen.getByText("재시도"));

        expect(handleRetry).toHaveBeenCalled();
      });

      it("onRemove 없으면 삭제 버튼 없음", () => {
        render(<FileUploadItem {...defaultProps} onRemove={undefined} />);

        expect(screen.queryByTitle("삭제")).not.toBeInTheDocument();
      });
    });
  });

  describe("Compact 레이아웃", () => {
    const compactProps: FileUploadItemProps = {
      ...defaultProps,
      variant: "compact",
    };

    describe("기본 렌더링", () => {
      it("파일명 표시", () => {
        render(<FileUploadItem {...compactProps} />);

        expect(screen.getByText("test-file.pdf")).toBeInTheDocument();
      });
    });

    describe("상태별 표시", () => {
      it("uploading: 진행률만 표시", () => {
        render(<FileUploadItem {...compactProps} status="uploading" progress={50} />);

        expect(screen.getByText("50%")).toBeInTheDocument();
      });

      it("error: 새로고침 아이콘", () => {
        const handleRetry = vi.fn();
        render(
          <FileUploadItem {...compactProps} status="error" onRetry={handleRetry} />
        );

        const retryButton = screen.getByTitle("재시도");
        fireEvent.click(retryButton);

        expect(handleRetry).toHaveBeenCalled();
      });
    });

    describe("버튼 동작", () => {
      it("삭제 버튼 클릭", () => {
        const handleRemove = vi.fn();
        render(<FileUploadItem {...compactProps} onRemove={handleRemove} />);

        const removeButton = screen.getByTitle("삭제");
        fireEvent.click(removeButton);

        expect(handleRemove).toHaveBeenCalled();
      });
    });
  });

  describe("진행률 바 (Wide)", () => {
    it("uploading 시 진행률 바 표시", () => {
      const { container } = render(
        <FileUploadItem {...defaultProps} status="uploading" progress={50} />
      );

      const progressBar = container.querySelector('[style*="width: 50%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it("진행률 0%", () => {
      const { container } = render(
        <FileUploadItem {...defaultProps} status="uploading" progress={0} />
      );

      const progressBar = container.querySelector('[style*="width: 0%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it("진행률 100%", () => {
      const { container } = render(
        <FileUploadItem {...defaultProps} status="uploading" progress={100} />
      );

      const progressBar = container.querySelector('[style*="width: 100%"]');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe("이벤트 전파 방지", () => {
    it("삭제 버튼 클릭 시 이벤트 전파 방지", () => {
      const handleRemove = vi.fn();
      const handleParentClick = vi.fn();

      render(
        <div onClick={handleParentClick}>
          <FileUploadItem {...defaultProps} onRemove={handleRemove} />
        </div>
      );

      fireEvent.click(screen.getByTitle("삭제"));

      expect(handleRemove).toHaveBeenCalled();
      // stopPropagation으로 인해 부모 클릭 이벤트 발생 안함
      expect(handleParentClick).not.toHaveBeenCalled();
    });
  });
});
