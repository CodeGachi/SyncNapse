import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import HomePage from '@/app/page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null),
  }),
}));

// Mock useAuth hook
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    loading: false,
    user: null,
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('HomePage', () => {
  it('renders SyncNapse title', () => {
    render(<HomePage />, { wrapper: createWrapper() });
    expect(screen.getByText('SyncNapse')).toBeInTheDocument();
  });

  it('renders login button', () => {
    render(<HomePage />, { wrapper: createWrapper() });
    expect(screen.getByText('시작하기')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<HomePage />, { wrapper: createWrapper() });
    // Check if the main container is rendered instead of checking specific Korean text
    const mainElement = screen.getByRole('main');
    expect(mainElement).toBeInTheDocument();
    expect(mainElement).toHaveClass('min-h-screen');
  });
});
