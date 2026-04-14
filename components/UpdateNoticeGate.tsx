import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../services/authContext';
import { UserRole } from '../types';
import { getUpdateNoticeConfig, UpdateNoticeEntry } from '../services/updateNoticeService';

const UpdateNoticeGate: React.FC = () => {
  const { user } = useAuth();
  const [entry, setEntry] = useState<UpdateNoticeEntry | null>(null);
  const [open, setOpen] = useState(false);

  const audience = useMemo<'user' | 'admin' | 'super_admin' | null>(() => {
    if (!user) return null;
    if (user.role === UserRole.SUPER_ADMIN) return 'super_admin';
    if (user.role === UserRole.ADMIN) return 'admin';
    if (user.role === UserRole.USER) return 'user';
    return null;
  }, [user]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!audience) return;
      try {
        const cfg = await getUpdateNoticeConfig();
        if (!mounted) return;
        setEntry(cfg.notices[audience]);
      } catch {
        // silent
      }
    })();

    return () => {
      mounted = false;
    };
  }, [audience]);

  const storageKey = useMemo(() => {
    if (!user || !audience || !entry) return '';
    return `eruai_update_notice_seen_${user.uid}_${audience}_${entry.version}`;
  }, [user, audience, entry]);

  useEffect(() => {
    if (!entry || !storageKey) return;
    if (!entry.enabled) return;

    const seen = localStorage.getItem(storageKey) === '1';
    setOpen(!seen);
  }, [entry, storageKey]);

  if (!open || !entry) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{entry.title}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{entry.intro}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5">
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
            {entry.bullets.map((b, idx) => (
              <li key={`${b}-${idx}`} className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-5 pb-5">
          <p className="mb-3 text-[11px] text-gray-500 dark:text-gray-400">
            eRuai is develop by Mohd Hisyamudin with AI Assistant
          </p>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                if (storageKey) localStorage.setItem(storageKey, '1');
                setOpen(false);
              }}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-2 text-sm font-semibold text-white"
            >
              Don’t show again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateNoticeGate;
