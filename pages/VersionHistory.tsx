import React from 'react';
import { CheckCircle2, History } from 'lucide-react';
import { changelog } from '../data/changelog';

const VersionHistory = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Version History</h1>
        <p className="text-gray-500 dark:text-gray-400">A timeline of key milestones and releases.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <ol className="relative border-l border-gray-200 dark:border-gray-700">
          {changelog.map((entry, index) => (
            <li key={entry.version} className={`${index === 0 ? 'mb-10' : 'mt-10'} ml-6`}>
              <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ${
                index === 0 ? 'bg-brand-maroon text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}>
                {index === 0 ? <CheckCircle2 className="h-4 w-4" /> : <History className="h-4 w-4" />}
              </span>
              <h3 className={`text-lg font-semibold ${index === 0 ? 'text-brand-maroon' : 'text-gray-700 dark:text-gray-300'}`}>
                v{entry.version}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{entry.date}</p>
              <ul className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-400 list-disc pl-5">
                {entry.changes.map(change => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </li>
          ))}

          {/* Legacy entries now come from changelog.ts */}
        </ol>
      </div>
    </div>
  );
};

export default VersionHistory;
