import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Users, Bell, Calendar } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { APP_CONFIG } from '../config/appConfig';
import { APP_VERSION } from '../data/changelog';

// Tribal Pattern for Landing Page Background (Adapted for Light/Dark modes)
const TribalPattern = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.03] dark:opacity-[0.05] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="tribal-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
        <path d="M30 0 L60 30 L30 60 L0 30 Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-indigo-900 dark:text-indigo-400" />
        <rect x="24" y="24" width="12" height="12" transform="rotate(45 30 30)" fill="currentColor" className="text-indigo-900 dark:text-indigo-400" />
        <path d="M0 0 L10 10 M50 50 L60 60 M60 0 L50 10 M10 50 L0 60" stroke="currentColor" strokeWidth="1" className="text-indigo-900 dark:text-indigo-400" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#tribal-grid)" />
  </svg>
);

const LandingPage = () => {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-white dark:bg-gray-950 transition-colors duration-200">
      
      {/* Hero Section */}
      <section className="relative px-4 py-20 lg:py-28 overflow-hidden">
        {/* Pattern Background */}
        <TribalPattern />
        
        {/* Gradient Mesh Effect (Optional Subtlety) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl bg-gradient-to-b from-indigo-50/50 to-transparent dark:from-indigo-950/20 dark:to-transparent pointer-events-none" />

        <div className="container mx-auto max-w-6xl text-center relative z-10">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            {APP_CONFIG.APP_NAME} : {APP_CONFIG.APP_SUBTITLE}
          </div>
          
          {/* The Story Paragraph */}
          <div className="max-w-xl mx-auto mb-8 animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-100">
            <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 leading-relaxed font-light italic">
              "{APP_CONFIG.APP_STORY}"
            </p>
          </div>

          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-gray-900 dark:text-white mb-4 drop-shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
            Book Meeting Rooms <br/>
            <span className="text-indigo-600 dark:text-indigo-400">Without the Chaos</span>
          </h1>

          {/* Version label */}
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-250">
            v{APP_VERSION} (Beta)
          </div>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
            Stop double-booking and fighting for space. {APP_CONFIG.APP_NAME} provides a seamless, 
            intelligent way to manage your organization's meeting spaces in real-time.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
            <Link to="/login" className="w-full sm:w-auto">
              <Button className="w-full text-xl h-16 px-12 shadow-indigo-200 dark:shadow-none shadow-lg hover:shadow-xl transition-all">Get Started</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 dark:bg-gray-950 py-20 px-4 transition-colors duration-200">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Everything you need to sync</h2>
            <p className="text-gray-500 dark:text-gray-400">Powerful features for teams of all sizes.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="w-6 h-6 text-yellow-500" />,
                title: "Real-time Availability",
                desc: "Instantly see which rooms are free. No more walking around finding empty seats."
              },
              {
                icon: <Shield className="w-6 h-6 text-indigo-500" />,
                title: "Smart Conflict Detection",
                desc: "Our engine mathematically ensures zero double-bookings, even with concurrent requests."
              },
              {
                icon: <Bell className="w-6 h-6 text-rose-500" />,
                title: "Automated Reminders",
                desc: "Automated meeting notifications and reminders to keep schedules on track and teams aligned."
              },
              {
                icon: <Calendar className="w-6 h-6 text-sky-500" />,
                title: "Fast Booking",
                desc: "Book, reschedule, or cancel in seconds with a clean, intuitive flow."
              },
              {
                icon: <Users className="w-6 h-6 text-green-500" />,
                title: "Permissions & Controls",
                desc: "Granular access controls so the right people can manage rooms, users, and settings."
              }
            ].map((feature, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-indigo-900 dark:bg-indigo-950 py-20 px-4 text-white transition-colors duration-200 relative overflow-hidden">
        {/* Subtle pattern overlay for CTA as well */}
        <div className="absolute inset-0 opacity-10">
            <TribalPattern />
        </div>
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <h2 className="text-3xl font-bold mb-8">Ready to streamline your office?</h2>
          <Link to="/login">
            <button className="px-8 py-4 bg-white text-indigo-900 dark:text-indigo-950 rounded-xl text-lg font-bold hover:bg-gray-100 transition-colors shadow-lg">
              Create Your Account
            </button>
          </Link>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 py-12 text-center text-gray-500 dark:text-gray-400 text-sm transition-colors duration-200">
         <p className="text-[11px] font-medium tracking-wide uppercase">
            System Design by{' '}
            <a
              href="https://mohdhisyamudin.com"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-gray-700 dark:hover:text-gray-200"
            >
              Mohd Hisyamudin
            </a>{' '}
            | Created with AI
         </p>
         <p className="mt-2 text-[10px] opacity-60">v{APP_VERSION} Beta</p>
      </footer>
    </div>
  );
};

export default LandingPage;
