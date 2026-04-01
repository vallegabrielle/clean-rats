import { StyleSheet } from 'react-native';
import { COLORS } from './constants';

export const swipeStyles = StyleSheet.create({
  swipeActions: {
    flexDirection: 'row',
    marginLeft: 6,
  },
  swipeEdit: {
    width: 56,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    marginRight: 4,
  },
  swipeEditText: {
    fontSize: 18,
    color: COLORS.textMuted,
  },
  swipeDelete: {
    width: 56,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  swipeDeleteText: {
    fontSize: 16,
    color: '#fff',
  },
});

export function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const hhmm = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) return `Hoje às ${hhmm}`;
  if (isYesterday) return `Ontem às ${hhmm}`;
  return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às ${hhmm}`;
}

export function getDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) return 'Hoje';
  if (isYesterday) return 'Ontem';
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Sanitizes a display name coming from external sources (Google Auth, user input).
 * - Trims and collapses whitespace runs to a single space
 * - Strips C0/C1 control chars, zero-width chars, BOM, and line/paragraph separators
 * - Truncates to maxLength (default 50)
 */
export function sanitizeName(raw: string, maxLength = 50): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF\u2028\u2029]/g, '')
    .slice(0, maxLength)
    .trim();
}

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}
