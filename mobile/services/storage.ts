import AsyncStorage from '@react-native-async-storage/async-storage';
import { Item } from '../types';

const KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
  CACHED_ITEMS: 'cached_items',
  FAVORITES: 'favorite_items',
  DRAFT_REPORT: 'draft_report',
  SERVER_IP: 'custom_server_ip',
};

export const StorageService = {
  // Auth Token & User
  async saveAuth(token: string, user: any): Promise<void> {
    await AsyncStorage.multiSet([
      [KEYS.TOKEN, token],
      [KEYS.USER, JSON.stringify(user)],
    ]);
  },

  async clearAuth(): Promise<void> {
    await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USER]);
  },

  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem(KEYS.TOKEN);
  },

  async getUser(): Promise<any | null> {
    const raw = await AsyncStorage.getItem(KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  },

  // Offline Caching of items
  async cacheItems(items: Item[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.CACHED_ITEMS, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to cache items offline', e);
    }
  },

  async getCachedItems(): Promise<Item[]> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.CACHED_ITEMS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  // Favorite / Saved Items
  async getFavorites(): Promise<number[]> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.FAVORITES);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  async toggleFavorite(itemId: number): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      let updated: number[];
      let isFav = false;
      if (favorites.includes(itemId)) {
        updated = favorites.filter((id) => id !== itemId);
        isFav = false;
      } else {
        updated = [...favorites, itemId];
        isFav = true;
      }
      await AsyncStorage.setItem(KEYS.FAVORITES, JSON.stringify(updated));
      return isFav;
    } catch (e) {
      return false;
    }
  },

  // Draft report for offline / in-progress reporting
  async saveDraft(draft: any): Promise<void> {
    await AsyncStorage.setItem(KEYS.DRAFT_REPORT, JSON.stringify(draft));
  },

  async getDraft(): Promise<any | null> {
    const raw = await AsyncStorage.getItem(KEYS.DRAFT_REPORT);
    return raw ? JSON.parse(raw) : null;
  },

  async clearDraft(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.DRAFT_REPORT);
  },

  // Server IP setting
  async setServerIp(ip: string): Promise<void> {
    await AsyncStorage.setItem(KEYS.SERVER_IP, ip);
  },

  async getServerIp(): Promise<string | null> {
    return await AsyncStorage.getItem(KEYS.SERVER_IP);
  },
};
