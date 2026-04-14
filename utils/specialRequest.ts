export interface SpecialRequestInfo {
  hasRequest: boolean;
  matchedKeywords: string[];
  summary: string;
  rawText: string;
}

// v1: simple, safe keyword-based detection for admin visibility.
// Info-only: does not imply approval or policy compliance.
const KEYWORDS: { label: string; pattern: RegExp }[] = [
  { label: 'lunch', pattern: /\blunch\b/i },
  { label: 'refreshment', pattern: /\brefreshment\b/i },
  { label: 'food', pattern: /\bfood\b/i },
  { label: 'breakfast', pattern: /\bbreakfast\b/i },
  // variants
  { label: 'tea break', pattern: /\btea\s*[-]?\s*break\b/i },
  { label: 'tea break', pattern: /\bteabreak\b/i },
];

const INTENT_HINT = /(request|mohon|please|pls|need|require|kindly)/i;

export function extractSpecialRequest(raw: unknown): SpecialRequestInfo {
  const rawText = String(raw ?? '').trim();
  if (!rawText) {
    return { hasRequest: false, matchedKeywords: [], summary: '', rawText: '' };
  }

  const matched: string[] = [];
  for (const k of KEYWORDS) {
    if (k.pattern.test(rawText)) matched.push(k.label);
  }

  // De-dupe, keep stable order based on KEYWORDS.
  const uniq = Array.from(new Set(matched));
  const summary = uniq.join(', ');

  const hasRequest = uniq.length > 0 || INTENT_HINT.test(rawText);
  return {
    hasRequest,
    matchedKeywords: uniq,
    summary: summary || (hasRequest ? 'general request' : ''),
    rawText,
  };
}

