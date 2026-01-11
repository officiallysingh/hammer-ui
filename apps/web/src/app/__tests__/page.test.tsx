import { render, screen } from '@testing-library/react';
import HomePage from '../page';

describe('HomePage', () => {
    it('renders welcome heading', () => {
        render(<HomePage />);
        expect(screen.getByRole('heading', { name: /welcome/i })).toBeInTheDocument();
    });
});
