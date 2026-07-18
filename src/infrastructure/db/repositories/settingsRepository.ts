import type { SettingsRepositoryPort } from '../../../application/ports';
import { db } from '../database';
import { now } from './shared';

export const settingsRepository: SettingsRepositoryPort = {
  get: () => db.userSettings.get('default'),
  async updateDefaultGraphRange(range) {
    const settings = await db.userSettings.get('default');
    if (settings) await db.userSettings.put({ ...settings, defaultGraphRange: range, updatedAt: now() });
  },
  async reset() {
    await db.delete();
    await db.open();
  }
};
