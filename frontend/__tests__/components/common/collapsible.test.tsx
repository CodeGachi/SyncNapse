/**
 * Collapsible 컴포넌트 테스트
 * 접기/펼치기 UI
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Collapsible, CollapsibleContent } from "@/components/common/collapsible";

describe("Collapsible", () => {
  describe("기본 렌더링", () => {
    it("title 표시", () => {
      render(
        <Collapsible title="섹션 제목">
          <div>내용</div>
        </Collapsible>
      );

      expect(screen.getByText("섹션 제목")).toBeInTheDocument();
    });

    it("기본적으로 닫힘 상태", () => {
      render(
        <Collapsible title="섹션">
          <div>숨겨진 내용</div>
        </Collapsible>
      );

      expect(screen.queryByText("숨겨진 내용")).not.toBeInTheDocument();
    });
  });

  describe("defaultOpen prop", () => {
    it("defaultOpen=true일 때 열림", () => {
      render(
        <Collapsible title="섹션" defaultOpen>
          <div>보이는 내용</div>
        </Collapsible>
      );

      expect(screen.getByText("보이는 내용")).toBeInTheDocument();
    });

    it("defaultOpen=false일 때 닫힘", () => {
      render(
        <Collapsible title="섹션" defaultOpen={false}>
          <div>숨겨진 내용</div>
        </Collapsible>
      );

      expect(screen.queryByText("숨겨진 내용")).not.toBeInTheDocument();
    });
  });

  describe("토글 동작", () => {
    it("클릭하면 열림", async () => {
      render(
        <Collapsible title="섹션">
          <div>내용</div>
        </Collapsible>
      );

      fireEvent.click(screen.getByText("섹션"));

      await waitFor(() => {
        expect(screen.getByText("내용")).toBeInTheDocument();
      });
    });

    it("다시 클릭하면 닫힘", async () => {
      render(
        <Collapsible title="섹션" defaultOpen>
          <div>내용</div>
        </Collapsible>
      );

      expect(screen.getByText("내용")).toBeInTheDocument();

      fireEvent.click(screen.getByText("섹션"));

      await waitFor(() => {
        expect(screen.queryByText("내용")).not.toBeInTheDocument();
      });
    });
  });

  describe("className prop", () => {
    it("커스텀 클래스 적용", () => {
      const { container } = render(
        <Collapsible title="섹션" className="custom-class">
          <div>내용</div>
        </Collapsible>
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("아이콘 회전", () => {
    it("ChevronDown 아이콘 존재", () => {
      const { container } = render(
        <Collapsible title="섹션">
          <div>내용</div>
        </Collapsible>
      );

      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });
});

describe("CollapsibleContent", () => {
  describe("기본 렌더링", () => {
    it("짧은 콘텐츠는 전체 표시", () => {
      render(<CollapsibleContent content="짧은 텍스트입니다." />);

      expect(screen.getByText("짧은 텍스트입니다.")).toBeInTheDocument();
      expect(screen.queryByText("더 보기")).not.toBeInTheDocument();
    });

    it("긴 콘텐츠는 잘라서 표시", () => {
      const longText = "가".repeat(400);
      render(<CollapsibleContent content={longText} maxLength={300} />);

      expect(screen.getByText("더 보기")).toBeInTheDocument();
    });
  });

  describe("maxLength prop", () => {
    it("커스텀 maxLength 적용", () => {
      const text = "가".repeat(200);
      render(<CollapsibleContent content={text} maxLength={100} />);

      expect(screen.getByText("더 보기")).toBeInTheDocument();
    });

    it("maxLength 이하면 더보기 없음", () => {
      const text = "가".repeat(50);
      render(<CollapsibleContent content={text} maxLength={100} />);

      expect(screen.queryByText("더 보기")).not.toBeInTheDocument();
    });
  });

  describe("펼치기/접기", () => {
    it("더 보기 클릭 시 전체 표시", async () => {
      const longText = "가".repeat(400);
      render(<CollapsibleContent content={longText} maxLength={300} />);

      fireEvent.click(screen.getByText("더 보기"));

      await waitFor(() => {
        expect(screen.getByText("접기")).toBeInTheDocument();
      });
    });

    it("접기 클릭 시 다시 축소", async () => {
      const longText = "가".repeat(400);
      render(<CollapsibleContent content={longText} maxLength={300} />);

      // 펼치기
      fireEvent.click(screen.getByText("더 보기"));

      await waitFor(() => {
        expect(screen.getByText("접기")).toBeInTheDocument();
      });

      // 접기
      fireEvent.click(screen.getByText("접기"));

      await waitFor(() => {
        expect(screen.getByText("더 보기")).toBeInTheDocument();
      });
    });
  });

  describe("className prop", () => {
    it("커스텀 클래스 적용", () => {
      const { container } = render(
        <CollapsibleContent content="텍스트" className="custom-content" />
      );

      expect(container.firstChild).toHaveClass("custom-content");
    });
  });
});
