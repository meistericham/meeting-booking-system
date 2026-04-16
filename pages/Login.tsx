import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Calendar, Loader2, Lock, Mail } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import { useAuth } from '../services/authContext';
import { UserRole } from '../types';

const Login: React.FC = () => {
  const { login, requestPasswordReset, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const requestedPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  const redirectPath = useMemo(() => {
    if (!user) {
      return '/dashboard';
    }

    if (user.role === UserRole.ADMIN) {
      return '/admin';
    }

    if (requestedPath && !requestedPath.startsWith('/admin')) {
      return requestedPath;
    }

    return '/dashboard';
  }, [requestedPath, user]);

  useEffect(() => {
    const stateEmail = (location.state as { email?: string } | null)?.email;
    if (stateEmail && !emailInput) {
      setEmailInput(stateEmail);
    }
  }, [emailInput, location.state]);

  useEffect(() => {
    if (user) {
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, redirectPath, user]);

  const handleLogin = async (email: string, password: string) => {
    setIsLoggingIn(true);
    setErrorMsg('');
    setResetMsg('');

    try {
      await login(email, password);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMsg('');
    setResetMsg('');

    if (!emailInput.trim()) {
      setErrorMsg('Please enter your email address first.');
      return;
    }

    setResetLoading(true);
    try {
      await requestPasswordReset(emailInput);
      setResetMsg('If an account exists for this email, a password reset link will be sent.');
    } catch (error) {
      setResetMsg(
        error instanceof Error
          ? error.message
          : 'If an account exists for this email, a password reset link will be sent.'
      );
    } finally {
      setResetLoading(false);
    }
  };

  const signupHref = emailInput.trim()
    ? `/signup?email=${encodeURIComponent(emailInput.trim())}`
    : '/signup';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-brand-maroon text-white lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_32%),linear-gradient(135deg,_#8a1c22_0%,_#521014_55%,_#1f1f1f_100%)]" />
          <div className="relative z-10 flex h-full max-w-xl flex-col justify-between px-12 py-14">
            <div>
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <Calendar className="h-6 w-6 text-amber-200" />
                <span className="text-sm font-semibold uppercase tracking-[0.25em] text-white/80">
                  Invite-Only Access
                </span>
              </div>
              <h1 className="mt-8 text-5xl font-bold leading-tight">
                Sign in to request and track venue bookings.
              </h1>
              <p className="mt-6 text-base leading-7 text-white/80">
                Public visitors can browse venues, but invited users must sign in before they
                can request a time slot. Admins use the same login to manage approvals.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/15 p-6 backdrop-blur-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
                {APP_CONFIG.APP_NAME}
              </p>
              <p className="mt-3 text-sm leading-6 text-white/80">{APP_CONFIG.APP_SUBTITLE}</p>
              <p className="mt-2 text-sm leading-6 text-white/70">{APP_CONFIG.APP_STORY}</p>
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="mb-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-brand-maroon dark:text-gray-400 dark:hover:text-red-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>

          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-maroon/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-maroon dark:bg-brand-maroon/20 dark:text-red-200">
              Account Login
            </div>
            <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
              Sign in to continue
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
              Use your invited user account to make bookings, or your admin account to manage
              requests.
            </p>
          </div>

          {errorMsg && (
            <div className="mt-8 flex max-w-md items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();

              if (!emailInput.trim() || !passwordInput) {
                setErrorMsg('Please enter both email and password.');
                return;
              }

              void handleLogin(emailInput, passwordInput);
            }}
            className="mt-8 max-w-md space-y-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(event) => setEmailInput(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(event) => setPasswordInput(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-maroon px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#74161c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in
                </>
              ) : (
                'Sign in'
              )}
            </button>

            <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
              <button
                type="button"
                onClick={() => void handleForgotPassword()}
                disabled={resetLoading}
                className="text-left text-sm font-medium text-brand-maroon transition-colors hover:text-[#74161c] disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-300 dark:hover:text-red-200"
              >
                {resetLoading ? 'Sending reset link...' : 'Forgot password?'}
              </button>

              <Link
                to={signupHref}
                className="text-sm font-medium text-gray-600 transition-colors hover:text-brand-maroon dark:text-gray-300 dark:hover:text-red-200"
              >
                Have an invite? Create your account
              </Link>
            </div>

            {resetMsg && (
              <p className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {resetMsg}
              </p>
            )}
          </form>
        </section>
      </div>
    </div>
  );
};

export default Login;
