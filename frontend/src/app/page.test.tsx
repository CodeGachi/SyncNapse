import { render, screen } from '@testing-library/react';
import HomePage from './page';

describe('HomePage', () => {
  it('renders welcome text', () => {
    render(<HomePage />);
    expect(screen.getByText(/Frontend is running/i)).toBeInTheDocument();
  });
});
