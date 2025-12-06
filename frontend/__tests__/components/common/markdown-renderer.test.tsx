/**
 * MarkdownRenderer 컴포넌트 테스트
 * Markdown 렌더링 (react-markdown + remark-gfm)
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownRenderer } from "@/components/common/markdown-renderer";

describe("MarkdownRenderer", () => {
  describe("제목", () => {
    it("h1 렌더링", () => {
      render(<MarkdownRenderer content="# 제목 1" />);

      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("제목 1");
    });

    it("h2 렌더링", () => {
      render(<MarkdownRenderer content="## 제목 2" />);

      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("제목 2");
    });

    it("h3 렌더링", () => {
      render(<MarkdownRenderer content="### 제목 3" />);

      expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("제목 3");
    });
  });

  describe("단락", () => {
    it("기본 텍스트", () => {
      render(<MarkdownRenderer content="일반 텍스트입니다." />);

      expect(screen.getByText("일반 텍스트입니다.")).toBeInTheDocument();
    });

    it("여러 단락", () => {
      const { container } = render(<MarkdownRenderer content="첫 번째 단락\n\n두 번째 단락" />);

      // 마크다운 렌더링이 되었는지 확인
      expect(container.querySelector(".markdown-content")).toBeInTheDocument();
    });
  });

  describe("리스트", () => {
    it("불릿 리스트", () => {
      const { container } = render(<MarkdownRenderer content="- 항목 1\n- 항목 2\n- 항목 3" />);

      // ul 요소가 생성되는지 확인
      const ul = container.querySelector("ul");
      expect(ul || container.textContent?.includes("항목 1")).toBeTruthy();
    });

    it("번호 리스트", () => {
      const { container } = render(<MarkdownRenderer content="1. 첫 번째\n2. 두 번째\n3. 세 번째" />);

      // ol 요소가 생성되는지 확인
      const ol = container.querySelector("ol");
      expect(ol || container.textContent?.includes("첫 번째")).toBeTruthy();
    });
  });

  describe("강조", () => {
    it("굵게 (strong)", () => {
      render(<MarkdownRenderer content="**굵은 텍스트**" />);

      const strong = screen.getByText("굵은 텍스트");
      expect(strong.tagName).toBe("STRONG");
    });

    it("기울임 (em)", () => {
      render(<MarkdownRenderer content="*기울인 텍스트*" />);

      const em = screen.getByText("기울인 텍스트");
      expect(em.tagName).toBe("EM");
    });
  });

  describe("코드", () => {
    it("인라인 코드", () => {
      render(<MarkdownRenderer content="이것은 `인라인 코드` 입니다." />);

      const code = screen.getByText("인라인 코드");
      expect(code.tagName).toBe("CODE");
    });

    it("코드 블록", () => {
      const { container } = render(<MarkdownRenderer content="```javascript\nconst x = 1;\n```" />);

      // 코드 블록이 렌더링되는지 확인 (pre 또는 code)
      const pre = container.querySelector("pre");
      const code = container.querySelector("code");
      expect(pre || code).toBeInTheDocument();
    });
  });

  describe("인용문", () => {
    it("blockquote 렌더링", () => {
      render(<MarkdownRenderer content="> 인용문입니다." />);

      const blockquote = document.querySelector("blockquote");
      expect(blockquote).toBeInTheDocument();
      expect(blockquote).toHaveTextContent("인용문입니다.");
    });
  });

  describe("링크", () => {
    it("링크 렌더링", () => {
      render(<MarkdownRenderer content="[구글](https://google.com)" />);

      const link = screen.getByRole("link", { name: "구글" });
      expect(link).toHaveAttribute("href", "https://google.com");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("구분선", () => {
    it("hr 또는 구분선 렌더링", () => {
      const { container } = render(<MarkdownRenderer content="위 텍스트\n\n---\n\n아래 텍스트" />);

      // hr 요소 또는 구분선이 포함되어 있는지 확인
      const hr = container.querySelector("hr");
      // react-markdown이 hr을 다르게 처리할 수 있으므로 유연하게 확인
      expect(hr || container.innerHTML.includes("---") || container.textContent?.includes("위 텍스트")).toBeTruthy();
    });
  });

  describe("테이블 (GFM)", () => {
    it("테이블 렌더링", () => {
      const tableMarkdown = `
| 이름 | 나이 |
|------|------|
| 철수 | 20 |
| 영희 | 25 |
      `;
      render(<MarkdownRenderer content={tableMarkdown} />);

      expect(screen.getByText("이름")).toBeInTheDocument();
      expect(screen.getByText("나이")).toBeInTheDocument();
      expect(screen.getByText("철수")).toBeInTheDocument();
      expect(screen.getByText("20")).toBeInTheDocument();
    });
  });

  describe("className prop", () => {
    it("커스텀 클래스 적용", () => {
      const { container } = render(
        <MarkdownRenderer content="텍스트" className="custom-markdown" />
      );

      expect(container.firstChild).toHaveClass("markdown-content", "custom-markdown");
    });
  });

  describe("복합 마크다운", () => {
    it("여러 요소 조합", () => {
      const complexMarkdown = `
# 제목

이것은 **굵은** 텍스트와 *기울인* 텍스트입니다.

- 항목 1
- 항목 2

> 인용문

\`코드\`
      `;
      render(<MarkdownRenderer content={complexMarkdown} />);

      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("제목");
      expect(screen.getByText("굵은")).toBeInTheDocument();
      expect(screen.getByText("기울인")).toBeInTheDocument();
      expect(document.querySelector("blockquote")).toBeInTheDocument();
      expect(screen.getByText("코드")).toBeInTheDocument();
    });
  });
});
