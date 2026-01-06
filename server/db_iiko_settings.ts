/**
 * CHU TEA - IIKO Settings (Admin Controlled)
 */

export interface IIKOSettings {
  enabled: boolean;
  apiUrl: string;
  apiLogin: string;
  organizationId: string;
  syncInterval: number;  // in minutes
  lastSyncAt: string;
  autoSyncEnabled: boolean;
  respectManualOverride: boolean;
  updatedAt: string;
  updatedBy: string;
}

// Default settings
export const IIKO_SETTINGS: IIKOSettings = {
  enabled: false,
  apiUrl: 'https://api-ru.iiko.services',
  apiLogin: '',
  organizationId: '',
  syncInterval: 5,  // 5 minutes
  lastSyncAt: '',
  autoSyncEnabled: false,
  respectManualOverride: true,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

export function getIIKOSettings(): IIKOSettings {
  return { ...IIKO_SETTINGS };
}

export function updateIIKOSettings(updates: Partial<IIKOSettings>, adminName: string): IIKOSettings {
  Object.assign(IIKO_SETTINGS, updates);
  IIKO_SETTINGS.updatedAt = new Date().toISOString();
  IIKO_SETTINGS.updatedBy = adminName;
  
  console.log(`[Admin] IIKO settings updated by ${adminName}:`, updates);
  return { ...IIKO_SETTINGS };
}

export function updateLastSyncTime(): void {
  IIKO_SETTINGS.lastSyncAt = new Date().toISOString();
}
