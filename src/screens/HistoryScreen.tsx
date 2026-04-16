import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants';
import { useHouseStore, selectActiveHouse } from '../contexts/HouseContext';
import { ScreenHeader } from '../components/ScreenHeader';
import { EmptyState } from '../components/EmptyState';
import { PeriodRecord, PeriodScore } from '../types';
import { AdBanner } from '../components/AdBanner';
import i18n from '../i18n';

const MEDALS = ['🥇', '🥈', '🥉'];

function toDisplayLocale(lang: string): string {
  if (lang === 'pt') return 'pt-BR';
  if (lang === 'en') return 'en-US';
  return lang;
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const locale = toDisplayLocale(i18n.language);
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  const sStr = s.toLocaleDateString(locale, opts);
  const eStr = e.toLocaleDateString(locale, opts);
  const year = e.getFullYear();
  return `${sStr} – ${eStr}, ${year}`;
}

function PeriodCard({ record, index }: { record: PeriodRecord; index: number }) {
  const { t } = useTranslation();
  const sorted = [...record.scores].sort((a, b) => b.points - a.points);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.periodLabel}>{t('history.period', { index })}</Text>
        <Text style={styles.periodDates}>{formatDateRange(record.periodStart, record.periodEnd)}</Text>
        {!!record.prize && (
          <Text style={styles.periodPrize}>🏆 {record.prize}</Text>
        )}
      </View>

      {sorted.length === 0 ? (
        <Text style={styles.emptyText}>{t('history.noRecords')}</Text>
      ) : (
        sorted.map((score: PeriodScore, i: number) => {
          const rank = sorted.filter((s) => s.points > score.points).length;
          const medal = MEDALS[rank] ?? `${rank + 1}.`;
          return (
            <View key={score.memberId} style={styles.row}>
              <Text style={styles.medal}>{medal}</Text>
              <Text style={styles.memberName} numberOfLines={1}>{score.memberName}</Text>
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsValue}>{score.points}</Text>
                <Text style={styles.pointsLabel}>pts</Text>
              </View>
              <Text style={styles.tasksCount}>{t('history.task', { count: score.completedTasks })}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

export default function HistoryScreen() {
  const { t } = useTranslation();
  const house = useHouseStore(selectActiveHouse);

  const history = house ? [...(house.history ?? [])].reverse() : [];

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />

      <ScreenHeader title={t('history.title')} />

      <View style={styles.content}>
        {history.length === 0 ? (
          <EmptyState
            icon="🐀"
            title={t('history.noPeriods')}
            text={t('history.noPeriodsSubtitle')}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {history.map((record, i) => (
              <PeriodCard key={record.periodStart} record={record} index={history.length - i} />
            ))}
          </ScrollView>
        )}
      </View>

      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1 },

  list: { padding: 20, gap: 12, paddingBottom: 40 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 2,
  },
  periodLabel: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  periodDates: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 13,
    color: COLORS.text,
  },
  periodPrize: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  medal: { fontSize: 18, width: 28, textAlign: 'center' },
  memberName: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  pointsBadge: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  pointsValue: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 14,
    color: COLORS.red,
  },
  pointsLabel: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  tasksCount: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 11,
    color: COLORS.textMuted,
    minWidth: 70,
    textAlign: 'right',
  },

  emptyText: {
    fontFamily: 'NotoSansMono_400Regular',
    fontSize: 13,
    color: COLORS.textMuted,
    padding: 14,
  },

});
