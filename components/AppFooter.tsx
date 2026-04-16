import React from 'react';
import { Calendar } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';

interface AppFooterProps {
  className?: string;
}

const AppFooter: React.FC<AppFooterProps> = ({ className = '' }) => {
  const classes = [
    'border-t border-gray-200 bg-white py-4 transition-all duration-300 dark:border-gray-700 dark:bg-gray-900',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <footer className={classes}>
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 md:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded bg-brand-maroon p-1">
            <Calendar className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {APP_CONFIG.APP_NAME}
          </span>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Design by{' '}
          <a
            href="https://mohdhisyamudin.com"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-gray-700 underline transition-colors hover:text-brand-maroon dark:text-gray-200 dark:hover:text-red-200"
          >
            Mohd Hisyamudin
          </a>{' '}
          | Created with AI
        </p>
      </div>
    </footer>
  );
};

export default AppFooter;
