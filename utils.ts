type DateInput =
  | Date
  | string
  | number
  | { toDate?: () => Date; toMillis?: () => number }
  | null
  | undefined;

const toDate = (value: DateInput): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      return value.toDate();
    }
    if (typeof value.toMillis === 'function') {
      const parsed = new Date(value.toMillis());
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  return null;
};

export const formatDateStandard = (value: DateInput): string => {
  const date = toDate(value);
  if (!date) return '';

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
};
