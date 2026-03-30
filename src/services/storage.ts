import AsyncStorage from '@react-native-async-storage/async-storage';
import { House } from '../types';

const HOUSES_KEY = '@clean_rats:houses';
const ACTIVE_KEY = '@clean_rats:activeHouseId';

function isValidHouse(data: unknown): data is House {
  if (!data || typeof data !== 'object') return false;
  const h = data as Record<string, unknown>;
  return (
    typeof h.id === 'string' &&
    typeof h.name === 'string' &&
    typeof h.code === 'string' &&
    (h.period === 'weekly' || h.period === 'biweekly' || h.period === 'monthly') &&
    Array.isArray(h.members) &&
    Array.isArray(h.tasks) &&
    Array.isArray(h.logs) &&
    typeof h.createdAt === 'string'
  );
}

export async function saveHouses(houses: House[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HOUSES_KEY, JSON.stringify(houses));
  } catch (e) {
    console.error('[storage] saveHouses failed:', e);
    throw e;
  }
}

export async function loadHouses(): Promise<House[]> {
  try {
    const data = await AsyncStorage.getItem(HOUSES_KEY);
    if (!data) return [];
    const parsed: unknown = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      console.warn('[storage] loadHouses: invalid schema, clearing.');
      await AsyncStorage.removeItem(HOUSES_KEY);
      return [];
    }
    const valid = parsed.filter(isValidHouse);
    if (valid.length !== parsed.length) {
      console.warn('[storage] loadHouses: some entries were invalid and removed.');
      await AsyncStorage.setItem(HOUSES_KEY, JSON.stringify(valid));
    }
    return valid;
  } catch (e) {
    console.error('[storage] loadHouses failed:', e);
    return [];
  }
}

export async function saveActiveHouseId(id: string | null): Promise<void> {
  try {
    if (id === null) {
      await AsyncStorage.removeItem(ACTIVE_KEY);
    } else {
      await AsyncStorage.setItem(ACTIVE_KEY, id);
    }
  } catch (e) {
    console.error('[storage] saveActiveHouseId failed:', e);
    throw e;
  }
}

export async function loadActiveHouseId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVE_KEY);
  } catch (e) {
    console.error('[storage] loadActiveHouseId failed:', e);
    return null;
  }
}

export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([HOUSES_KEY, ACTIVE_KEY]);
  } catch (e) {
    console.error('[storage] clearAllData failed:', e);
    throw e;
  }
}
