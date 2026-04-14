import React, { useState } from 'react';
import { CheckCircle2, History, Map as MapIcon, Sparkles } from 'lucide-react';
import { changelog } from '../data/changelog';

const roadmap = [
  {
    title: 'Office Transport Booking',
    status: 'Roadmap',
    description:
      'Right now, booking transport is still manual (paper form → inform driver → request approval). With this module, we centralize everything in e‑RUAI for all users: request submission → admin approval → driver notification/scheduling → trip record (history). Users only need to fill in the booking details, and the admin can review/approve in one place — fully trackable end‑to‑end. Less admin work, fewer miscommunications, and faster turnaround.',
  },
  {
    title: 'All-Year STB Plan (System Evolution)',
    status: 'Roadmap',
    description:
      'Establish the Yearly STB Plan as a core module in eRuai to deliver centralized visibility for planning, tracking, and decision-making in one platform. Calendar entries will be governed in coordination with the Strategic & Transformation Unit (STU) to ensure alignment and execution discipline.',
  },
  {
    title: 'Auto Online Meeting Link (Zoom/Teams/Meet) generated via e‑RUAI',
    status: 'Roadmap',
    description:
      'When a user requests an online meeting, e‑RUAI can auto-generate the meeting link (via Admin selection or API integration). Includes choosing a meeting host/account and saving the join link into the booking record.',
  },
  {
    title: 'Automated meeting reminders to users via email (7:30am on meeting day)',
    status: 'Done',
    description:
      'Send a daily reminder email at 7:30am to users who have approved bookings on the same day. Likely via scheduled Cloud Function / cron, with opt-out and templated content.',
  },
  {
    title: 'CC notification emails to additional recipients for meeting room bookings',
    status: 'Roadmap',
    description:
      'Allow requester to add CC email(s) so relevant parties also receive booking confirmations/updates. Requires validation, audit trail, and optional domain restrictions.',
  },
];

// Protected: for display only (local UI helper)
const versionSeriesLabel = (s: string) => {
  if (s.startsWith('0.9.')) return 'Hardening + production rollout improvements.';
  if (s.startsWith('1.0.')) return 'Major production milestone.';
  return 'Version series updates.';
};

const SystemEvolution: React.FC = () => {
  const [tab, setTab] = useState<'versions' | 'roadmap'>('versions');

  return (
    <div className="min-h-[70vh] rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Evolution</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Version updates (shipped) and roadmap (planned improvements).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab('versions')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border transition-colors ${
            tab === 'versions'
              ? 'bg-brand-maroon text-white border-brand-maroon'
              : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <History className="h-4 w-4" />
          Version Updates
        </button>
        <button
          onClick={() => setTab('roadmap')}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border transition-colors ${
            tab === 'roadmap'
              ? 'bg-brand-maroon text-white border-brand-maroon'
              : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <MapIcon className="h-4 w-4" />
          Roadmap
        </button>
      </div>

      {tab === 'versions' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          {changelog.map((entry, index) => {
            const versions = entry.changes
              .map((line) => {
                const m = line.match(/^v(\d+\.\d+\.\d+)\s*\(([^)]+)\):\s*(.*)$/);
                if (!m) return null;
                const version = m[1];
                const date = m[2];
                const detail = m[3];

                // Short title: prefer the part before an em-dash (—) if present.
                const dashParts = detail.split('—');
                const summary = (dashParts[0] || detail).trim();

                // Detail bullets: after em-dash, split by ';' into compact bullets.
                const detailRemainder = dashParts.length > 1 ? dashParts.slice(1).join('—').trim() : '';
                const detailBullets = detailRemainder
                  ? detailRemainder
                      .split(';')
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : [];
                const parts = version.split('.');
                const series = parts.length >= 2 ? `${parts[0]}.${parts[1]}.x` : version;

                return {
                  version,
                  series,
                  date,
                  summary,
                  detail,
                  detailBullets,
                  raw: line,
                };
              })
              .filter(Boolean) as Array<{
              version: string;
              series: string;
              date: string;
              summary: string;
              detail: string;
              detailBullets: string[];
              raw: string;
            }>;

            const seriesGroups = (() => {
              const map = new Map<string, typeof versions>();
              for (const v of versions) {
                const arr = map.get(v.series) || [];
                arr.push(v);
                map.set(v.series, arr);
              }

              const mergeByVersion = (items: typeof versions) => {
                const byVersion = new Map<string, {
                  version: string;
                  series: string;
                  date: string;
                  summary: string;
                  details: string[];
                  raw: string[];
                }>();

                for (const it of items) {
                  const existing = byVersion.get(it.version);
                  if (!existing) {
                    byVersion.set(it.version, {
                      version: it.version,
                      series: it.series,
                      date: it.date,
                      summary: it.summary,
                      details: it.detailBullets.length > 0 ? it.detailBullets : [it.detail],
                      raw: [it.raw]
                    });
                  } else {
                    existing.details.push(
                      ...(it.detailBullets.length > 0 ? it.detailBullets : [it.detail])
                    );
                    existing.raw.push(it.raw);
                  }
                }

                return [...byVersion.values()]
                  .sort((a, b) => (a.version < b.version ? 1 : -1));
              };

              return Array.from(map.entries())
                .map(([series, items]) => ({
                  series,
                  summary: versionSeriesLabel(series),
                  items: mergeByVersion(items),
                }))
                .sort((a, b) => (a.series < b.series ? 1 : -1));
            })();

            const otherLines = entry.changes.filter((l) => !l.startsWith('v'));

            return (
              <div
                key={entry.version}
                className={`${index === 0 ? '' : 'mt-10'} ${
                  index === 0 ? '' : 'pt-8 border-t border-gray-100 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full ${
                      index === 0
                        ? 'bg-brand-maroon text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {index === 0 ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <History className="h-4 w-4" />
                    )}
                  </span>
                  <div>
                    <h3
                      className={`text-lg font-semibold ${
                        index === 0
                          ? 'text-brand-maroon'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {entry.version}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {entry.date}
                    </p>
                  </div>
                </div>

                {seriesGroups.length > 0 && (
                  <div className="mt-5">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      Version Series
                    </div>

                    <div className="mt-3 space-y-3">
                      {seriesGroups.map((group, groupIdx) => (
                        <details
                          key={group.series}
                          open={groupIdx === 0}
                          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/30 px-4 py-3"
                        >
                          <summary className="cursor-pointer list-none select-none">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  v{group.series}
                                </div>
                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  {group.summary}
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {group.items.length} releases
                              </div>
                            </div>
                          </summary>

                          <div className="mt-3 space-y-2">
                            {group.items.map((c, i) => (
                              <details
                                key={c.raw[0]}
                                open={i === 0}
                                className="group rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 px-4 py-3"
                              >
                                <summary className="cursor-pointer list-none select-none">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                      v{c.version} — {c.summary}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {c.date}
                                    </div>
                                  </div>
                                </summary>
                                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                  {c.details.length === 1 ? (
                                    <div>{c.details[0]}</div>
                                  ) : (
                                    <ul className="list-disc pl-5 space-y-1">
                                      {c.details.map((d) => (
                                        <li key={d}>{d}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </details>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                )}

                {otherLines.length > 0 && (
                  <ul className="mt-5 space-y-1 text-sm text-gray-600 dark:text-gray-400 list-disc pl-5">
                    {otherLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
            <Sparkles className="h-5 w-5 text-brand-maroon" />
            Planned Enhancements
          </div>
          <div className="mt-4 space-y-4">
            {roadmap.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {item.title}
                    </div>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {item.description}
                    </div>
                  </div>
                  <span className="shrink-0 inline-flex items-center rounded-full bg-yellow-50 dark:bg-yellow-900/20 px-2.5 py-1 text-xs font-semibold text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemEvolution;
