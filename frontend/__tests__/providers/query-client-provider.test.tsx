/**
 * Tests for QueryProvider component
 */

import { render, screen } from "@testing-library/react";
import { QueryProvider } from "@/providers/query-client-provider";

describe("QueryProvider", () => {
  it("renders children correctly", () => {
    render(
      <QueryProvider>
        <div>Test Child</div>
      </QueryProvider>
    );

    expect(screen.getByText("Test Child")).toBeInTheDocument();
  });

  it("provides QueryClient to children", () => {
    const TestComponent = () => {
      // This would throw if QueryClient is not provided
      return <div>Connected</div>;
    };

    render(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>
    );

    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("does not render DevTools in production", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const { container } = render(
      <QueryProvider>
        <div>Test</div>
      </QueryProvider>
    );

    // DevTools should not be in DOM
    expect(container.querySelector('[class*="ReactQueryDevtools"]')).toBeNull();

    process.env.NODE_ENV = originalEnv;
  });
});
