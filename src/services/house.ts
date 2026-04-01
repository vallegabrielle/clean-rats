import * as Crypto from 'expo-crypto';
import { House, Member, Period, Task } from '../types';
import { DEFAULT_TASKS, MAX_TASK_POINTS } from '../constants';
import { getCurrentPeriodStart } from './period';

function generateId(): string {
  return Crypto.randomUUID();
}

function generateCode(): string {
  // Crockford Base32 alphabet (32 chars): excludes I, L, O, U to avoid visual ambiguity.
  // 8 chars → 32^8 ≈ 1.1 trillion combinations (vs. the previous 16^6 ≈ 16.7 million).
  // Uses crypto-random bytes; modulo bias is zero because 256 / 32 = 8 exactly.
  const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const bytes = Crypto.getRandomBytes(8);
  return Array.from(bytes).map(b => ALPHABET[b % 32]).join('');
}

export function createHouse(
  name: string,
  period: Period,
  ownerId: string,
  ownerName: string,
  selectedTasks?: Omit<Task, 'id'>[],
): House {
  const owner: Member = { id: ownerId, name: ownerName };
  const taskSource = selectedTasks ?? DEFAULT_TASKS;
  const tasks: Task[] = taskSource.map((t) => ({ ...t, id: generateId() }));
  return {
    id: generateId(),
    name,
    code: generateCode(),
    period,
    memberIds: [ownerId],
    members: [owner],
    tasks,
    logs: [],
    createdAt: new Date().toISOString(),
    periodStart: getCurrentPeriodStart(period).toISOString(),
    history: [],
  };
}

export function addMember(house: House, memberName: string): House {
  const member: Member = { id: generateId(), name: memberName };
  return { ...house, members: [...house.members, member] };
}

export function addTask(house: House, name: string, points: number): { house: House; task: Task } {
  if (points <= 0) throw new Error('Points must be greater than 0');
  if (points > MAX_TASK_POINTS) throw new Error(`Points must be at most ${MAX_TASK_POINTS}`);
  const task: Task = { id: generateId(), name, points, isDefault: false };
  return { house: { ...house, tasks: [...house.tasks, task] }, task };
}

export function removeTask(house: House, taskId: string): House {
  return { ...house, tasks: house.tasks.filter((t) => t.id !== taskId) };
}

export function updateTask(house: House, taskId: string, name: string, points: number): House {
  if (points <= 0) throw new Error('Points must be greater than 0');
  if (points > MAX_TASK_POINTS) throw new Error(`Points must be at most ${MAX_TASK_POINTS}`);
  return {
    ...house,
    tasks: house.tasks.map((t) => t.id === taskId ? { ...t, name, points } : t),
  };
}

export function removeLog(house: House, logId: string): House {
  return { ...house, logs: house.logs.filter((l) => l.id !== logId) };
}

export function updateLog(house: House, logId: string, taskId: string): House {
  if (!house.tasks.some((t) => t.id === taskId)) throw new Error(`Task ${taskId} not found in house`);
  return {
    ...house,
    logs: house.logs.map((l) => l.id === logId ? { ...l, taskId } : l),
  };
}

export function logTask(house: House, taskId: string, memberId: string): House {
  const taskExists = house.tasks.some((t) => t.id === taskId);
  const memberExists = house.members.some((m) => m.id === memberId);
  if (!taskExists) throw new Error(`Task ${taskId} not found in house`);
  if (!memberExists) throw new Error(`Member ${memberId} not found in house`);
  const log = {
    id: generateId(),
    taskId,
    memberId,
    completedAt: new Date().toISOString(),
  };
  return { ...house, logs: [...house.logs, log] };
}