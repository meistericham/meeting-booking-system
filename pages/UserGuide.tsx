import React, { useEffect, useMemo, useState } from 'react';
import guideRaw from '../USER_GUIDE.md?raw';
import { Printer } from 'lucide-react';

type Heading = {
  id: string;
  text: string;
  level: 1 | 2 | 3;
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

const UserGuide: React.FC = () => {
  const lines = guideRaw.split('\n');
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');

  const headings = useMemo<Heading[]>(() => {
    const seen = new Map<string, number>();
    const list: Heading[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      let level: 1 | 2 | 3 | null = null;
      let text = '';

      if (trimmed.startsWith('# ')) {
        level = 1;
        text = trimmed.replace(/^#\s+/, '');
      } else if (trimmed.startsWith('## ')) {
        level = 2;
        text = trimmed.replace(/^##\s+/, '');
      } else if (trimmed.startsWith('### ')) {
        level = 3;
        text = trimmed.replace(/^###\s+/, '');
      }

      if (!level || !text) continue;

      const base = slugify(text) || 'section';
      const count = (seen.get(base) || 0) + 1;
      seen.set(base, count);
      const id = count > 1 ? `${base}-${count}` : base;

      list.push({ id, text, level });
    }

    return list;
  }, [lines]);

  useEffect(() => {
    if (!headings.length) return;

    const onScroll = () => {
      let currentId = headings[0].id;

      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (!el) continue;

        const top = el.getBoundingClientRect().top;
        if (top <= 140) currentId = h.id;
      }

      setActiveHeadingId(currentId);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [headings]);

  const renderInline = (text: string) => {
    const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      parts.push(
        <a
          key={`${match[2]}-${match.index}`}
          href={match[2]}
          target="_blank"
          rel="noreferrer"
          className="text-indigo-600 hover:underline dark:text-indigo-400"
        >
          {match[1]}
        </a>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length ? parts : text;
  };

  let headingIndex = -1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 max-w-7xl mx-auto">
      <aside className="lg:sticky lg:top-6 h-fit rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Contents</h2>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Printer size={14} />
            Print
          </button>
        </div>

        <nav className="space-y-1 text-sm max-h-[70vh] overflow-auto pr-1">
          {headings.map((h) => {
            const isActive = activeHeadingId === h.id;

            return (
              <button
                key={h.id}
                type="button"
                onClick={() => {
                  const el = document.getElementById(h.id);
                  if (!el) return;
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  setActiveHeadingId(h.id);
                }}
                className={`block w-full text-left rounded-md px-2 py-1 transition-colors ${
                  isActive
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                } ${
                  h.level === 1
                    ? 'font-semibold text-slate-900 dark:text-slate-100'
                    : h.level === 2
                    ? 'pl-4 text-slate-700 dark:text-slate-200'
                    : 'pl-7 text-slate-500 dark:text-slate-400'
                }`}
              >
                {h.text}
              </button>
            );
          })}
        </nav>
      </aside>

      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">User Guide</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Panduan penggunaan e-RUAI (inside app)</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="space-y-2 text-sm leading-7 text-slate-700 dark:text-slate-200">
            {lines.map((line, idx) => {
              const trimmed = line.trim();

              if (!trimmed) return <div key={idx} className="h-2" />;

              if (trimmed.startsWith('# ')) {
                headingIndex += 1;
                const h = headings[headingIndex];
                return (
                  <h2 id={h?.id} key={idx} className="text-xl font-bold mt-4 text-slate-900 dark:text-slate-100 scroll-mt-24">
                    {trimmed.replace(/^#\s+/, '')}
                  </h2>
                );
              }

              if (trimmed.startsWith('## ')) {
                headingIndex += 1;
                const h = headings[headingIndex];
                return (
                  <h3 id={h?.id} key={idx} className="text-lg font-semibold mt-4 text-slate-900 dark:text-slate-100 scroll-mt-24">
                    {trimmed.replace(/^##\s+/, '')}
                  </h3>
                );
              }

              if (trimmed.startsWith('### ')) {
                headingIndex += 1;
                const h = headings[headingIndex];
                return (
                  <h4 id={h?.id} key={idx} className="text-base font-semibold mt-3 text-slate-900 dark:text-slate-100 scroll-mt-24">
                    {trimmed.replace(/^###\s+/, '')}
                  </h4>
                );
              }

              if (trimmed.startsWith('- ')) {
                return (
                  <div key={idx} className="flex gap-2">
                    <span>•</span>
                    <span>{renderInline(trimmed.replace(/^-\s+/, ''))}</span>
                  </div>
                );
              }

              return (
                <p key={idx} className="text-sm">
                  {renderInline(trimmed)}
                </p>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserGuide;
