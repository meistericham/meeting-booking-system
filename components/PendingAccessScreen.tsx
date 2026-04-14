import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Card from './ui/Card';

const PendingAccessScreen: React.FC = () => {
  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center px-6 py-10">
      <Card className="max-w-xl w-full text-center p-8">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Account Under Review</h2>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Thank you for registering. Your account is currently pending approval from an Admin Leader.
          You will receive full access once approved.
        </p>
        <div className="mt-6">
          <Link
            to="/profile"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            Edit My Profile
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default PendingAccessScreen;
