import { House, MemberScore, Period, PeriodRecord, PeriodScore, TaskLog } from '../types';

export function getCurrentPeriodStart(period: Period, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);

  if (period === 'weekly') {
    d.setDate(d.getDate() - d.getDay()); // recua até domingo
    return d;
  }

  if (period === 'biweekly') {
    d.setDate(d.getDate() >= 16 ? 16 : 1);
    return d;
  }

  // monthly
  d.setDate(1);
  return d;
}

export function computePeriodScores(house: Pick<House, 'members' | 'tasks'>, logs: TaskLog[]): PeriodScore[] {
  return house.members.map((m) => {
    const memberLogs = logs.filter((l) => l.memberId === m.id);
    const points = memberLogs.reduce((sum, l) => {
      const task = house.tasks.find((t) => t.id === l.taskId);
      return sum + (task?.points ?? 0);
    }, 0);
    return { memberId: m.id, memberName: m.name, points, completedTasks: memberLogs.length };
  });
}

export function computeScores(house: Pick<House, 'members' | 'tasks'>, logs: TaskLog[]): MemberScore[] {
  return house.members
    .map((member) => {
      const memberLogs = logs.filter((l) => l.memberId === member.id);
      const points = memberLogs.reduce((sum, l) => {
        const task = house.tasks.find((t) => t.id === l.taskId);
        return sum + (task?.points ?? 0);
      }, 0);
      return { member, points, completedTasks: memberLogs.length };
    })
    .sort((a, b) => b.points - a.points);
}

export type PeriodCheckResult =
  | { type: 'none' }                        // mesmo período, nada a fazer
  | { type: 'init'; house: House }          // sem periodStart — inicializa só localmente, sem write
  | { type: 'reset'; newPeriodStart: string }; // período expirou — deve escrever no Firestore

/**
 * Verifica o estado do período da toca.
 * - 'none'  → nada mudou, não escrever
 * - 'init'  → casa antiga sem periodStart, inicializar localmente sem write
 * - 'reset' → período expirou, arquivar e limpar logs (requer write)
 *
 * Note: history archiving and log cleanup are handled by the subscriber.
 */
export function checkAndResetPeriod(house: House): PeriodCheckResult {
  const now = new Date();
  const currentPeriodStart = getCurrentPeriodStart(house.period, now);

  // Casa sem periodStart (dados antigos): inicializa localmente sem escrever
  if (!house.periodStart) {
    return {
      type: 'init',
      house: { ...house, periodStart: currentPeriodStart.toISOString(), history: house.history ?? [] },
    };
  }

  const storedStart = new Date(house.periodStart);
  storedStart.setHours(0, 0, 0, 0);

  // Ainda no mesmo período — nada a fazer
  if (storedStart >= currentPeriodStart) return { type: 'none' };

  // Período expirou: return new period start, archiving is done by the subscriber
  return {
    type: 'reset',
    newPeriodStart: currentPeriodStart.toISOString(),
  };
}

/**
 * Builds a PeriodRecord for archiving, using the provided logs.
 * Call this before clearing logs when a period expires.
 */
export function buildPeriodRecord(
  house: Pick<House, 'members' | 'tasks' | 'periodStart' | 'prize'>,
  logs: TaskLog[],
): PeriodRecord {
  const scores = computePeriodScores(house, logs);
  return {
    periodStart: house.periodStart,
    periodEnd: new Date().toISOString(),
    scores,
    ...(house.prize ? { prize: house.prize } : {}),
  };
}
