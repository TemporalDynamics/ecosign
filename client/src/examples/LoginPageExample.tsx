/**
 * Example: Login Page with E2E Integration
 * 
 * This shows how to use the useAuthWithE2E hook in a login page.
 * Copy the relevant parts to your actual LoginPage.tsx
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthWithE2E } from '../hooks/useAuthWithE2E';
import { E2EStatus } from '../components/E2EStatus';

export function LoginPageExample() {
  const navigate = useNavigate();
  const { signInWithOtp, signIn, loading, error, e2eReady } = useAuthWithE2E();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await signInWithOtp(email);
      setSubmitted(true);
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await signIn(email, password);
      
      // Wait a moment for E2E to initialize
      setTimeout(() => {
        if (e2eReady) {
          console.log('✅ E2E encryption ready!');
        }
        navigate('/inicio');
      }, 500);
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  if (submitted && !usePassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">📧</div>
            <h2 className="text-2xl font-bold mb-4">Check your email</h2>
            <p className="text-gray-600 mb-6">
              We sent a magic link to <strong>{email}</strong>
            </p>
            <p className="text-sm text-gray-500">
              Click the link in the email to sign in.
              <br />
              The link expires in 1 hour.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-6 text-blue-600 hover:text-blue-700 text-sm"
            >
              ← Try another email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">Welcome to EcoSign</h1>
            <p className="text-gray-600 mt-2">Sign in to your account</p>
          </div>

          <form onSubmit={usePassword ? handlePasswordLogin : handleOtpLogin}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              {usePassword && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{error.message}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Signing in...' : usePassword ? 'Sign in with Password' : 'Send Magic Link'}
              </button>
            </div>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setUsePassword(!usePassword)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {usePassword ? '← Use magic link instead' : 'Use password instead →'}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t">
            <p className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <a href="/signup" className="text-blue-600 hover:text-blue-700 font-semibold">
                Sign up
              </a>
            </p>
          </div>
        </div>

        {/* E2E Status (only show in development) */}
        {import.meta.env.DEV && (
          <E2EStatus show={true} compact={false} />
        )}
      </div>
    </div>
  );
}
