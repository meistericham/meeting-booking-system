import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../services/authContext'; // ✅ CORRECT PATH
import { UserRole } from '../types';
import { Calendar, ArrowLeft, Loader2, AlertCircle, Mail, Lock, CheckCircle2 } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import { APP_VERSION } from '../data/changelog';
import { logger } from '../utils/logger';

// ...rest of the file remains the same

// --- TRIBAL PATTERN COMPONENT (Kekalkan Design Asal) ---
const TribalPattern = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none mix-blend-overlay" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="tribal-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
        <path d="M30 0 L60 30 L30 60 L0 30 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white" />
        <rect x="24" y="24" width="12" height="12" transform="rotate(45 30 30)" fill="currentColor" className="text-white" />
        <path d="M0 0 L10 10 M50 50 L60 60 M60 0 L50 10 M10 50 L0 60" stroke="currentColor" strokeWidth="1" className="text-white" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#tribal-grid)" />
    <rect width="100%" height="100%" fill="url(#fade-grad)" />
    <defs>
      <linearGradient id="fade-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="black" stopOpacity="0" />
        <stop offset="100%" stopColor="black" stopOpacity="0.3" />
      </linearGradient>
    </defs>
  </svg>
);

const Login = () => {
  const { login, requestPasswordReset, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resetMsg, setResetMsg] = useState<string>('');
  const [resetLoading, setResetLoading] = useState(false);
  
  // ✅ FIX: Tambah state untuk Password
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  useEffect(() => {
    const stateEmail = (location.state as { email?: string } | null)?.email;
    if (stateEmail && !emailInput) {
      setEmailInput(stateEmail);
    }
  }, [location.state, emailInput]);

  React.useEffect(() => {
    if (user) {
      if (user.role === UserRole.SUPER_ADMIN) navigate('/super-admin');
      else if (user.role === UserRole.ADMIN) navigate('/admin');
      else navigate('/dashboard');
    }
  }, [user, navigate]);

  // ✅ FIX: Terima password sebagai argument kedua
  const handleLogin = async (email: string, password: string) => {
    setIsLoggingIn(true);
    setErrorMsg('');
    setResetMsg('');
    try {
      await login(email, password);
    } catch (err: any) {
      logger.error(err);
      // Format error message supaya lebih mesra pengguna
      let message = err.message;
      if (err.message.includes('auth/invalid-credential') || err.message.includes('auth/user-not-found')) {
        message = "Invalid email or password.";
      } else if (err.message.includes('auth/missing-password')) {
        message = "Please enter your password.";
      }
      setErrorMsg(message);
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
    } catch (err: any) {
      // keep message non-sensitive
      setResetMsg(err.message || 'If an account exists for this email, a password reset link will be sent.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950 font-sans transition-colors duration-200">
      
      {/* --- LEFT PANEL: BRANDING --- */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-center items-center overflow-hidden bg-indigo-950 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 z-0"></div>
        <TribalPattern />
        <div className="relative z-10 max-w-lg px-12 text-center md:text-left">
           <div className="mb-8 inline-flex p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 shadow-2xl">
              <Calendar className="w-10 h-10 text-indigo-300" />
           </div>
           <h1 className="text-7xl font-black tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200 drop-shadow-sm">
             {APP_CONFIG.APP_NAME}
           </h1>
           <p className="text-xl font-light tracking-[0.2em] text-indigo-200 uppercase mb-10 border-b border-indigo-500/30 pb-4 inline-block">
             {APP_CONFIG.APP_SUBTITLE}
           </p>
           <div className="space-y-4 text-indigo-100/80 leading-relaxed text-lg font-light">
             <p>{APP_CONFIG.APP_STORY}</p>
           </div>
        </div>
        <div className="absolute bottom-8 left-12 z-10">
           <span className="px-3 py-1 rounded-full bg-black/20 text-indigo-300 text-xs font-mono border border-indigo-500/20">
             v{APP_VERSION}
           </span>
        </div>
      </div>

      {/* --- RIGHT PANEL: LOGIN ACTION --- */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between relative bg-white dark:bg-gray-950">
        
        <div className="lg:hidden p-6 flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-lg">
                <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white">{APP_CONFIG.APP_NAME}</span>
        </div>
        
        <div className="absolute top-6 right-6 lg:left-6 lg:right-auto z-20">
             <Link to="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Home
             </Link>
        </div>

        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 md:px-24">
           
           <div className="mb-10 text-center lg:text-left">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome back
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Please enter your details to sign in.
              </p>
           </div>

           {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
              </div>
           )}

           <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!emailInput || !passwordInput) {
                  setErrorMsg('Please enter both email and password');
                  return;
                }
                handleLogin(emailInput, passwordInput);
              }}
              className="space-y-5 mb-6"
           >
              <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
                 <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                        type="email" 
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-indigo-500 outline-none transition-all dark:text-white"
                    />
                 </div>
              </div>
              
              {/* ✅ FIX: Password Input kini disambungkan ke state */}
              <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
                 <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                        type="password" 
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-indigo-500 outline-none transition-all dark:text-white"
                    />
                 </div>
                 <div className="mt-2 flex items-center justify-end">
                   <button
                     type="button"
                     onClick={handleForgotPassword}
                     disabled={resetLoading}
                     className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors disabled:opacity-50"
                   >
                     {resetLoading ? 'Sending reset link…' : 'Forgot password?'}
                   </button>
                 </div>
                 {resetMsg && (
                   <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{resetMsg}</p>
                 )}
              </div>
              
              <button 
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                 {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
              </button>
           </form>

           <div className="mb-8 text-center lg:text-left">
              <Link
                to="/signup"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
              >
                Don't have an account? Sign Up
              </Link>
            </div>

        </div>

        <div className="p-6 text-center">
            <p className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">
              System Design by{' '}
              <a
                href="https://mohdhisyamudin.com"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-gray-600 dark:hover:text-gray-200"
              >
                Mohd Hisyamudin
              </a>{' '}
              | Created with AI
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
