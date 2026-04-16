import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Calendar, Loader2, Mail, Phone, User } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import { useAuth } from '../services/authContext';
import { SignupInput, UserRole } from '../types';

const Signup: React.FC = () => {
  const { signup, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const [form, setForm] = useState<SignupInput>({
    displayName: '',
    email: searchParams.get('email') || '',
    password: '',
    phoneNumber: '',
    organization: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      navigate(user.role === UserRole.ADMIN ? '/admin' : '/dashboard', { replace: true });
    }
  }, [navigate, user]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg('');

    if (!form.displayName.trim()) {
      setErrorMsg('Display name is required.');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setErrorMsg('Please enter a valid invited email address.');
      return;
    }

    if (form.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (form.password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      await signup(form);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to create account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1fr_1fr]">
        <section className="relative hidden overflow-hidden bg-gray-950 text-white lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_32%),linear-gradient(135deg,_#1f1f1f_0%,_#521014_60%,_#8a1c22_100%)]" />
          <div className="relative z-10 flex h-full max-w-xl flex-col justify-between px-12 py-14">
            <div>
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                <Calendar className="h-6 w-6 text-amber-200" />
                <span className="text-sm font-semibold uppercase tracking-[0.25em] text-white/80">
                  Invited User Signup
                </span>
              </div>
              <h1 className="mt-8 text-5xl font-bold leading-tight">
                Create your account and start booking available venues.
              </h1>
              <p className="mt-6 text-base leading-7 text-white/80">
                Signup is limited to invited email addresses. Once your account is created, you
                can browse availability, submit bookings, and track approval status.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/15 p-6 backdrop-blur-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
                {APP_CONFIG.APP_NAME}
              </p>
              <p className="mt-3 text-sm leading-6 text-white/80">{APP_CONFIG.APP_SUBTITLE}</p>
              <p className="mt-2 text-sm leading-6 text-white/70">
                Use the invited email address exactly as provided in your invite email.
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="mb-8">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-brand-maroon dark:text-gray-400 dark:hover:text-red-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>

          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-maroon/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-maroon dark:bg-brand-maroon/20 dark:text-red-200">
              Account Setup
            </div>
            <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
              Create your invited account
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
              Your email must already be on the approved invite list before signup will work.
            </p>
          </div>

          {errorMsg && (
            <div className="mt-8 flex max-w-md items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="mt-8 max-w-md space-y-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  name="displayName"
                  value={form.displayName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Invited Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-11 pr-4 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  placeholder="+60 12-345 6789"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Organization
              </label>
              <input
                name="organization"
                value={form.organization}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                placeholder="Your team or organization"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  placeholder="Min. 6 characters"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  placeholder="Repeat password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-maroon px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#74161c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Signup;
