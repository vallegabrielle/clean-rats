import { StyleSheet } from 'react-native';
import { COLORS } from './constants';
import i18n from './i18n';

function toDisplayLocale(lang: string): string {
  if (lang === 'pt') return 'pt-BR';
  if (lang === 'en') return 'en-US';
  return lang;
}

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
  const locale = toDisplayLocale(i18n.language);
  const hhmm = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

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

  if (isToday) return i18n.t('date.todayAt', { time: hhmm });
  if (isYesterday) return i18n.t('date.yesterdayAt', { time: hhmm });
  return date.toLocaleString(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function getDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const locale = toDisplayLocale(i18n.language);

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

  if (isToday) return i18n.t('date.today');
  if (isYesterday) return i18n.t('date.yesterday');
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: 'short' });
  }
  return date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
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

const AVATAR_COLORS = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#d35400', '#16a085'];

export function avatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}
