/**
 * Modal 컴포넌트 테스트
 * Portal 기반 모달 다이얼로그
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Modal } from "@/components/common/modal";

describe("Modal", () => {
  beforeEach(() => {
    // body overflow 초기화
    document.body.style.overflow = "";
  });

  afterEach(() => {
    document.body.style.overflow = "";
  });

  describe("렌더링", () => {
    it("isOpen=false일 때 렌더링 안함", () => {
      render(
        <Modal isOpen={false} onClose={() => {}}>
          <div>Modal Content</div>
        </Modal>
      );

      expect(screen.queryByText("Modal Content")).not.toBeInTheDocument();
    });

    it("isOpen=true일 때 렌더링", async () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Modal Content</div>
        </Modal>
      );

      await waitFor(() => {
        expect(screen.getByText("Modal Content")).toBeInTheDocument();
      });
    });

    it("title 렌더링", async () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="테스트 모달">
          <div>Content</div>
        </Modal>
      );

      await waitFor(() => {
        expect(screen.getByText("테스트 모달")).toBeInTheDocument();
      });
    });
  });

  describe("닫기 동작", () => {
    it("오버레이 클릭 시 onClose 호출", async () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose}>
          <div>Content</div>
        </Modal>
      );

      await waitFor(() => {
        expect(screen.getByText("Content")).toBeInTheDocument();
      });

      // 오버레이 클릭 (backdrop)
      const overlay = document.querySelector(".fixed.inset-0.bg-black\\/40");
      if (overlay) {
        fireEvent.click(overlay);
        expect(handleClose).toHaveBeenCalled();
      }
    });

    it("ESC 키 누르면 onClose 호출", async () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose}>
          <div>Content</div>
        </Modal>
      );

      await waitFor(() => {
        expect(screen.getByText("Content")).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: "Escape" });

      expect(handleClose).toHaveBeenCalled();
    });

    it("닫기 버튼 클릭 시 onClose 호출", async () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="테스트">
          <div>Content</div>
        </Modal>
      );

      await waitFor(() => {
        expect(screen.getByText("테스트")).toBeInTheDocument();
      });

      // 닫기 버튼 (X 아이콘)
      const closeButton = document.querySelector("button");
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(handleClose).toHaveBeenCalled();
      }
    });
  });

  describe("closeButton 옵션", () => {
    it("closeButton=false일 때 닫기 버튼 숨김", async () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="테스트" closeButton={false}>
          <div>Content</div>
        </Modal>
      );

      await waitFor(() => {
        expect(screen.getByText("테스트")).toBeInTheDocument();
      });

      // 헤더 안의 버튼이 없어야 함
      const header = document.querySelector(".flex.items-center.justify-between");
      const closeBtn = header?.querySelector("button");
      expect(closeBtn).toBeNull();
    });
  });

  describe("스크롤 방지", () => {
    it("모달 열릴 때 body overflow hidden", async () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <div>Content</div>
        </Modal>
      );

      await waitFor(() => {
        expect(document.body.style.overflow).toBe("hidden");
      });
    });
  });

  describe("커스텀 스타일", () => {
    it("overlayClassName 적용", async () => {
      render(
        <Modal
          isOpen={true}
          onClose={() => {}}
          overlayClassName="custom-overlay"
        >
          <div>Content</div>
        </Modal>
      );

      await waitFor(() => {
        const overlay = document.querySelector(".custom-overlay");
        expect(overlay).toBeInTheDocument();
      });
    });

    it("contentClassName 적용", async () => {
      render(
        <Modal
          isOpen={true}
          onClose={() => {}}
          contentClassName="custom-content"
        >
          <div>Content</div>
        </Modal>
      );

      await waitFor(() => {
        const content = document.querySelector(".custom-content");
        expect(content).toBeInTheDocument();
      });
    });
  });

  describe("컨텐츠 클릭 전파 방지", () => {
    it("모달 내부 클릭 시 닫히지 않음", async () => {
      const handleClose = vi.fn();
      render(
        <Modal isOpen={true} onClose={handleClose}>
          <button>내부 버튼</button>
        </Modal>
      );

      await waitFor(() => {
        expect(screen.getByText("내부 버튼")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("내부 버튼"));

      // 내부 클릭은 onClose를 호출하지 않아야 함
      expect(handleClose).not.toHaveBeenCalled();
    });
  });
});
