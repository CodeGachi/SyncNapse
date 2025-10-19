import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import HomePage from './page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('HomePage', () => {
  it('renders SyncNapse title', () => {
    render(<HomePage />);
    expect(screen.getByText('SyncNapse')).toBeInTheDocument();
  });

  it('renders login button', () => {
    render(<HomePage />);
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<HomePage />);
    expect(screen.getByText(/스마트한 필기 서비스/i)).toBeInTheDocument();
  });
});
