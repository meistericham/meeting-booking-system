import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2, Mail, Lock, User, Building2 } from 'lucide-react';
import { useAuth } from '../services/authContext';
import { APP_CONFIG } from '../config/appConfig';
import { fetchUnits } from '../services/dataService';
import { Unit } from '../types';

const SignUp = () => {
  const { register, logout } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [units, setUnits] = useState<Unit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setUnitsLoading(true);
        const data = await fetchUnits();
        if (!mounted) return;
        const sorted = [...data].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setUnits(sorted);
        if (!department && sorted.length > 0) {
          setDepartment(sorted[0].name);
        }
      } catch (err) {
        // non-blocking: keep dropdown empty
      } finally {
        if (mounted) setUnitsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName || !email || !department || !password) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    // Enforce department/unit selection from defined Units
    if (!unitsLoading && units.length > 0) {
      const ok = units.some((u) => u.name === department);
      if (!ok) {
        setErrorMsg('Please select your Department / Unit from the list.');
        return;
      }
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isOfficial = normalizedEmail.endsWith('@sarawaktourism.com');

    if (!isOfficial) {
      const ok1 = window.confirm(
        'Reminder: Please use your official @sarawaktourism.com email to register.'
      );
      if (!ok1) return;

      const ok2 = window.confirm(
        'Final reminder: Are you sure you want to proceed without an official @sarawaktourism.com email?'
      );
      if (!ok2) return;
    }

    setIsSubmitting(true);
    try {
      await register(normalizedEmail, password, fullName, department);

      // UX: show success first, then return to login (account will be pending approval)
      window.alert('✅ Success! Your account has been created. Admin will approve your account before access is granted.');

      // After Firebase createUserWithEmailAndPassword, user is auto-signed-in.
      // We sign out so the next step is a clean login (pending accounts will be locked by the app).
      try {
        await logout();
      } catch {
        // non-blocking: still allow redirect to login
      }

      navigate('/login', { state: { email: normalizedEmail } });
    } catch (error: any) {
      const raw = String(error?.message || error);
      const code = String(error?.code || '');

      // In some cases (adblock/shields), the browser blocks Firestore/Auth requests and the UI surfaces
      // a generic "Missing or insufficient permissions" even though it's a network/client block.
      const looksLikeBlockedClient =
        raw.includes('ERR_BLOCKED_BY_CLIENT') ||
        raw.toLowerCase().includes('blocked') ||
        raw.includes('net::ERR') ||
        raw.toLowerCase().includes('failed to fetch');

      const looksLikePermissions =
        code === 'permission-denied' ||
        raw.toLowerCase().includes('missing or insufficient permissions');

      if (looksLikeBlockedClient || looksLikePermissions) {
        setErrorMsg(
          'Sign-up failed because Firebase requests were blocked (common with adblock/privacy extensions or Brave Shields).\n\nFix: disable the extension/shields for this site or use Incognito, then try again.'
        );
      } else {
        setErrorMsg(error.message || 'Registration failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950 font-sans transition-colors duration-200">
      <div className="w-full lg:w-1/2 flex flex-col justify-between relative bg-white dark:bg-gray-950 mx-auto">
        <div className="lg:hidden p-6 flex items-center gap-2">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <User className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900 dark:text-white">{APP_CONFIG.APP_NAME}</span>
        </div>

        <div className="absolute top-6 right-6 lg:left-6 lg:right-auto z-20">
          <Link to="/login" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Login
          </Link>
        </div>

        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 md:px-24">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Create your account</h2>
            <p className="text-gray-500 dark:text-gray-400">
              Submit your details for approval before access is granted.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-indigo-500 outline-none transition-all dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-indigo-500 outline-none transition-all dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Department / Unit</label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  disabled={unitsLoading || units.length === 0}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-indigo-500 outline-none transition-all dark:text-white appearance-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {unitsLoading && <option value="">Loading units…</option>}
                  {!unitsLoading && units.length === 0 && <option value="">No units defined (contact Admin)</option>}
                  {!unitsLoading && units.length > 0 && units.map((u) => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                </select>
              </div>
              {!unitsLoading && units.length === 0 && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">No units are configured yet. Please contact Admin/Super Admin.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-indigo-500 outline-none transition-all dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-indigo-500 outline-none transition-all dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit for Approval'}
            </button>
          </form>

          <div className="mt-8 text-center lg:text-left">
            <span className="text-sm text-gray-500 dark:text-gray-400">Already have an account? </span>
            <Link
              to="/login"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
