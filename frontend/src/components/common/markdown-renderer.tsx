"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // 제목
        h1: ({ children }) => (
          <h1 className="text-lg font-bold text-foreground mt-4 mb-2 first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold text-foreground mt-3 mb-2 first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-foreground mt-2 mb-1 first:mt-0">
            {children}
          </h3>
        ),
        // 단락
        p: ({ children }) => (
          <p className="text-sm text-foreground-secondary leading-relaxed mb-2 last:mb-0">
            {children}
          </p>
        ),
        // 불릿 리스트
        ul: ({ children }) => (
          <ul className="list-disc list-inside space-y-1 mb-2 text-sm text-foreground-secondary pl-2">
            {children}
          </ul>
        ),
        // 번호 리스트
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-1 mb-2 text-sm text-foreground-secondary pl-2">
            {children}
          </ol>
        ),
        // 리스트 아이템
        li: ({ children }) => (
          <li className="leading-relaxed">
            {children}
          </li>
        ),
        // 강조
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">
            {children}
          </strong>
        ),
        em: ({ children }) => (
          <em className="italic text-foreground-secondary">
            {children}
          </em>
        ),
        // 인라인 코드
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <code className="block bg-background-overlay rounded-lg p-3 text-xs font-mono text-foreground-secondary overflow-x-auto my-2">
                {children}
              </code>
            );
          }
          return (
            <code className="bg-background-overlay px-1.5 py-0.5 rounded text-xs font-mono text-brand">
              {children}
            </code>
          );
        },
        // 코드 블록
        pre: ({ children }) => (
          <pre className="bg-background-overlay rounded-lg p-3 overflow-x-auto my-2">
            {children}
          </pre>
        ),
        // 인용문
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-brand/50 pl-3 my-2 text-foreground-tertiary italic">
            {children}
          </blockquote>
        ),
        // 구분선
        hr: () => (
          <hr className="border-border my-3" />
        ),
        // 링크
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:underline"
          >
            {children}
          </a>
        ),
        // 테이블
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full text-sm border border-border rounded-lg">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-background-overlay">
            {children}
          </thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left font-semibold text-foreground border-b border-border">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-foreground-secondary border-b border-border">
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
}
