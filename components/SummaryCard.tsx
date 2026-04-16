import React from 'react';
import { type LucideIcon } from 'lucide-react';

type SummaryTone = 'blue' | 'amber' | 'green' | 'red' | 'slate';

const toneClasses: Record<SummaryTone, string> = {
  blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/10 dark:text-blue-300',
  amber:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300',
  green:
    'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/10 dark:text-green-300',
  red: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300',
  slate:
    'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-300',
};

interface SummaryCardProps {
  label: string;
  value: number;
  detail: string;
  icon: LucideIcon;
  tone?: SummaryTone;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'slate',
}) => {
  return (
    <article className={`rounded-3xl border p-5 ${toneClasses[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] opacity-80">{detail}</p>
        </div>
        <div className="rounded-2xl bg-white/70 p-3 shadow-sm dark:bg-gray-900/40">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
};

export default SummaryCard;
