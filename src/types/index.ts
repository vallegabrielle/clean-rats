export type Period = 'weekly' | 'biweekly' | 'monthly';

export interface Member {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  name: string;
  points: number;
  isDefault: boolean;
}

export interface TaskLog {
  id: string;
  taskId: string;
  memberId: string;
  completedAt: string; // ISO date string
}

export interface PeriodScore {
  memberId: string;
  memberName: string;
  points: number;
  completedTasks: number;
}

export interface PeriodRecord {
  periodStart: string; // ISO
  periodEnd: string;   // ISO
  scores: PeriodScore[];
  prize?: string;
}

export interface JoinRequest {
  userId: string;
  name: string;
  requestedAt: string; // ISO
}

export interface House {
  id: string;
  name: string;
  code: string;
  period: Period;
  prize?: string;
  memberIds: string[]; // Firebase UIDs — used for Firestore queries
  members: Member[];
  tasks: Task[];
  createdAt: string;
  periodStart: string;           // ISO — início do período atual
  history: PeriodRecord[];       // histórico de períodos anteriores
  pendingRequests?: JoinRequest[];
  pendingMemberIds?: string[];   // Firebase UIDs — used for Firestore queries
}

export interface MemberScore {
  member: Member;
  points: number;
  completedTasks: number;
}
