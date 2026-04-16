export interface CalendarDayCell {
  date: Date;
  dateKey: string;
  inCurrentMonth: boolean;
}

export const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDateKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

export const getMonthBounds = (monthDate: Date) => {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  return {
    start: formatDateKey(firstDay),
    end: formatDateKey(lastDay),
  };
};

export const buildMonthGrid = (monthDate: Date): CalendarDayCell[] => {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + index);
    return {
      date: cellDate,
      dateKey: formatDateKey(cellDate),
      inCurrentMonth: cellDate.getMonth() === monthDate.getMonth(),
    };
  });
};

export const getMonthLabel = (monthDate: Date): string =>
  monthDate.toLocaleDateString('en-MY', {
    month: 'long',
    year: 'numeric',
  });
