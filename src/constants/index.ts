import { Task } from '../types';

export const MAX_TASK_POINTS = 1000;

export const RADIUS = {
  sm: 8,
  md: 10,
  lg: 16,
  full: 9999,
};

export const COLORS = {
  background: '#121212',
  surface: '#1e1e1e',
  surfaceAlt: '#2a2a2a',
  text: '#ffffff',
  textMuted: '#a0a0a0',
  red: '#c0392b',
  danger: '#e94560',
  border: '#333333',
};

export const DEFAULT_TASKS: Omit<Task, 'id'>[] = [
  { name: 'Lavar louça', points: 10, isDefault: true },
  { name: 'Varrer / Aspirar', points: 15, isDefault: true },
  { name: 'Limpar banheiro', points: 20, isDefault: true },
  { name: 'Tirar lixo', points: 10, isDefault: true },
  { name: 'Limpar cozinha', points: 15, isDefault: true },
  { name: 'Lavar roupa', points: 20, isDefault: true },
  { name: 'Passar roupa', points: 15, isDefault: true },
  { name: 'Fazer compras', points: 25, isDefault: true },
];