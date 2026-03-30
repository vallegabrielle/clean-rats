import { House, MemberScore, Period, PeriodRecord, PeriodScore } from '../types';

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

export function computePeriodScores(house: House): PeriodScore[] {
  return house.members.map((m) => {
    const memberLogs = house.logs.filter((l) => l.memberId === m.id);
    const points = memberLogs.reduce((sum, l) => {
      const task = house.tasks.find((t) => t.id === l.taskId);
      return sum + (task?.points ?? 0);
    }, 0);
    return { memberId: m.id, memberName: m.name, points, completedTasks: memberLogs.length };
  });
}

export function computeScores(house: House): MemberScore[] {
  return house.members
    .map((member) => {
      const memberLogs = house.logs.filter((l) => l.memberId === member.id);
      const points = memberLogs.reduce((sum, l) => {
        const task = house.tasks.find((t) => t.id === l.taskId);
        return sum + (task?.points ?? 0);
      }, 0);
      return { member, points, completedTasks: memberLogs.length };
    })
    .sort((a, b) => b.points - a.points);
}

export type PeriodCheckResult =
  | { type: 'none' }                  // mesmo período, nada a fazer
  | { type: 'init'; house: House }    // sem periodStart — inicializa só localmente, sem write
  | { type: 'reset'; house: House };  // período expirou — deve escrever no Firestore

/**
 * Verifica o estado do período da toca.
 * - 'none'  → nada mudou, não escrever
 * - 'init'  → casa antiga sem periodStart, inicializar localmente sem write
 * - 'reset' → período expirou, arquivar e limpar logs (requer write)
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

  // Período expirou: arquiva e limpa os logs
  const scores = computePeriodScores(house);

  const alreadyArchived = (house.history ?? []).some((r) => r.periodStart === house.periodStart);

  const newRecord: PeriodRecord = {
    periodStart: house.periodStart,
    periodEnd: now.toISOString(),
    scores,
  };

  const history = alreadyArchived
    ? house.history
    : [...(house.history ?? []), newRecord];

  return {
    type: 'reset',
    house: { ...house, logs: [], periodStart: currentPeriodStart.toISOString(), history },
  };
}
