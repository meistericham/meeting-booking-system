export const DEFAULT_AVATAR_COLORS = [
  '#1F2937', // gray-800
  '#0F766E', // teal-700
  '#1D4ED8', // blue-700
  '#6D28D9', // violet-700
  '#B45309', // amber-700
  '#BE123C', // rose-700
  '#047857', // emerald-700
  '#B91C1C', // red-700
  '#4F46E5', // indigo-600
  '#0E7490', // cyan-700
  '#7C2D12', // orange-900
  '#334155', // slate-700
];

function safeUpper(s: string) {
  return (s || '').trim().toUpperCase();
}

export function getInitials(displayName?: string, email?: string) {
  const name = (displayName || '').trim();
  if (name) {
    const parts = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);
    if (parts.length === 1) return safeUpper(parts[0].slice(0, 2));
    return safeUpper(parts[0].slice(0, 1) + parts[1].slice(0, 1));
  }

  const e = (email || '').trim();
  if (e) {
    const local = e.split('@')[0] || e;
    const chunks = local.split(/[._\-\s]+/).filter(Boolean);
    const parts = chunks.slice(0, 2);
    if (parts.length === 1) return safeUpper(parts[0].slice(0, 2));
    return safeUpper(parts[0].slice(0, 1) + parts[1].slice(0, 1));
  }

  return '??';
}

export function colorFromString(seed: string, palette: string[] = DEFAULT_AVATAR_COLORS) {
  const s = (seed || 'unknown').trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  const idx = palette.length ? hash % palette.length : 0;
  return palette[idx] || '#1F2937';
}
