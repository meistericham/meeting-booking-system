import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Megaphone, Save } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { DEFAULT_UPDATE_NOTICE, getUpdateNoticeConfig, saveUpdateNoticeConfig, UpdateNoticeAudience, UpdateNoticeEntry } from '../services/updateNoticeService';

const SuperAdminUpdateNotice: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [audience, setAudience] = useState<UpdateNoticeAudience>('super_admin');
  const [noticeMap, setNoticeMap] = useState<Record<UpdateNoticeAudience, UpdateNoticeEntry>>(DEFAULT_UPDATE_NOTICE.notices);
  const [enabled, setEnabled] = useState(DEFAULT_UPDATE_NOTICE.notices.super_admin.enabled);
  const [version, setVersion] = useState(DEFAULT_UPDATE_NOTICE.notices.super_admin.version);
  const [title, setTitle] = useState(DEFAULT_UPDATE_NOTICE.notices.super_admin.title);
  const [intro, setIntro] = useState(DEFAULT_UPDATE_NOTICE.notices.super_admin.intro);
  const [bullets, setBullets] = useState(DEFAULT_UPDATE_NOTICE.notices.super_admin.bullets.join('\n'));

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cfg = await getUpdateNoticeConfig();
        if (!mounted) return;
        setNoticeMap(cfg.notices);
      } catch {
        // keep defaults
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const active = noticeMap[audience];
    if (!active) return;
    setEnabled(active.enabled);
    setVersion(active.version);
    setTitle(active.title);
    setIntro(active.intro);
    setBullets((active.bullets || []).join('\n'));
  }, [audience, noticeMap]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const list = bullets
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      if (!version.trim()) throw new Error('Version is required.');
      if (!title.trim()) throw new Error('Title is required.');
      if (list.length === 0) throw new Error('Please add at least one update bullet.');

      const nextMap: Record<UpdateNoticeAudience, UpdateNoticeEntry> = {
        ...noticeMap,
        [audience]: {
          enabled,
          version: version.trim(),
          title: title.trim(),
          intro: intro.trim() || 'Please review these latest updates:',
          bullets: list,
        },
      };

      await saveUpdateNoticeConfig({ notices: nextMap });
      setNoticeMap(nextMap);
      setMsg({ type: 'success', text: `Update notice saved for ${audience}.` });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to save update notice.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Update Notice Control</h1>
        <p className="text-gray-500 dark:text-gray-400">Super Admin only. Configure popup updates for User/Admin/Super Admin without hardcoding.</p>
      </div>

      <Card>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-gray-400" /> Audience Notice Editor
        </h2>

        <form onSubmit={onSave} className="space-y-4">
          {msg && (
            <div className={`p-4 rounded-lg flex items-center gap-2 text-sm ${
              msg.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}>
              {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {msg.text}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input id="notice-enabled" type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <label htmlFor="notice-enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable popup</label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as UpdateNoticeAudience)}
                className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5"
              >
                <option value="super_admin">Super Admin (test)</option>
                <option value="admin">Admin</option>
                <option value="user">User (live)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Version key</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. 2026-03-26"
                className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Intro</label>
            <input
              type="text"
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Updates (one line = one bullet)</label>
            <textarea
              rows={5}
              value={bullets}
              onChange={(e) => setBullets(e.target.value)}
              className="w-full border border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg p-2.5"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" isLoading={loading} icon={<Save className="w-4 h-4" />}>
              Save Update Notice
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default SuperAdminUpdateNotice;
