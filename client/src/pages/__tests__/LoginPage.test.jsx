import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../LoginPage';
import { mockSignIn, mockSignUp } from '../../lib/supabase';

jest.mock('react-i18next', () => ({
  useTranslation: () => {
    return {
      t: (str) => str,
      i18n: {
        changeLanguage: () => new Promise(() => {}),
      },
    };
  },
}));

jest.mock('../../lib/supabase', () => {
  const mockSignIn = jest.fn();
  const mockSignUp = jest.fn();
  return {
    supabase: {
      auth: {
        signInWithPassword: mockSignIn,
        signUp: mockSignUp,
      },
    },
    mockSignIn,
    mockSignUp,
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    mockSignIn.mockResolvedValue({ data: { user: { email: 'test@example.com' } }, error: null });
    mockSignUp.mockResolvedValue({ data: { user: { email: 'test@example.com' } }, error: null });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the login form', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { name: 'login_title' })).toBeInTheDocument();
    expect(screen.getByLabelText('email_label')).toBeInTheDocument();
    expect(screen.getByLabelText('password_label')).toBeInTheDocument();
  });

  it('submits the form with email and password', async () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    await act(async () => {
      fireEvent.change(screen.getByLabelText('email_label'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByLabelText('password_label'), {
        target: { value: 'password' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'login_button' }));
    });

    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
  });

  it('switches to the register form', async () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'register_button' }));
    });

    expect(screen.getByRole('heading', { name: 'create_account_title' })).toBeInTheDocument();
    expect(screen.getByLabelText('confirm_password_label')).toBeInTheDocument();
  });

  it('navigates to the guest page', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const guestLink = screen.getByRole('link', { name: 'continue_as_guest' });
    expect(guestLink).toHaveAttribute('href', '/guest');
  });
});
