/**
 * cn 유틸리티 테스트
 * 클래스명 병합 유틸리티
 */

import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils/cn";

describe("cn", () => {
  describe("기본 병합", () => {
    it("단일 클래스", () => {
      expect(cn("text-red-500")).toBe("text-red-500");
    });

    it("여러 클래스 병합", () => {
      expect(cn("p-4", "m-2")).toBe("p-4 m-2");
    });

    it("빈 값 무시", () => {
      expect(cn("p-4", "", "m-2")).toBe("p-4 m-2");
    });

    it("null/undefined 무시", () => {
      expect(cn("p-4", null, undefined, "m-2")).toBe("p-4 m-2");
    });
  });

  describe("Tailwind 충돌 해결", () => {
    it("같은 속성 충돌 시 후자 우선", () => {
      expect(cn("p-4", "p-2")).toBe("p-2");
    });

    it("색상 충돌 해결", () => {
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    });

    it("배경색 충돌 해결", () => {
      expect(cn("bg-white", "bg-black")).toBe("bg-black");
    });

    it("여백 충돌 해결", () => {
      expect(cn("m-4", "m-8")).toBe("m-8");
    });

    it("패딩 충돌 해결", () => {
      expect(cn("px-4", "px-8")).toBe("px-8");
    });
  });

  describe("조건부 클래스", () => {
    it("조건부 true", () => {
      const isActive = true;
      expect(cn("base", isActive && "active")).toBe("base active");
    });

    it("조건부 false", () => {
      const isActive = false;
      expect(cn("base", isActive && "active")).toBe("base");
    });

    it("삼항 연산자", () => {
      const isError = true;
      expect(cn("input", isError ? "border-red-500" : "border-gray-300")).toBe(
        "input border-red-500"
      );
    });
  });

  describe("객체 형식", () => {
    it("객체 조건부 클래스", () => {
      expect(
        cn("base", {
          active: true,
          disabled: false,
        })
      ).toBe("base active");
    });

    it("빈 객체", () => {
      expect(cn("base", {})).toBe("base");
    });
  });

  describe("배열 형식", () => {
    it("배열 클래스", () => {
      expect(cn(["p-4", "m-2"])).toBe("p-4 m-2");
    });

    it("중첩 배열", () => {
      expect(cn(["p-4", ["m-2", "text-sm"]])).toBe("p-4 m-2 text-sm");
    });
  });

  describe("복합 케이스", () => {
    it("다양한 형식 혼합", () => {
      const isActive = true;
      expect(
        cn(
          "base-class",
          "p-4",
          isActive && "active",
          { hidden: false, visible: true },
          ["array-class"]
        )
      ).toBe("base-class p-4 active visible array-class");
    });

    it("Tailwind 충돌 + 조건부", () => {
      const variant = "primary";
      expect(
        cn(
          "bg-gray-100",
          variant === "primary" && "bg-blue-500",
          variant === "danger" && "bg-red-500"
        )
      ).toBe("bg-blue-500");
    });
  });

  describe("엣지 케이스", () => {
    it("인자 없음", () => {
      expect(cn()).toBe("");
    });

    it("모든 falsy 값", () => {
      expect(cn(null, undefined, false, "", 0)).toBe("");
    });

    it("공백 포함 클래스", () => {
      expect(cn("  p-4  ", "  m-2  ")).toBe("p-4 m-2");
    });
  });
});
