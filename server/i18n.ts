/**
 * CHU TEA - Internationalization (i18n) System
 * 
 * Supported languages: Chinese (ZH), English (EN), Russian (RU)
 */

export type Language = 'zh' | 'en' | 'ru';

export interface Translation {
  key: string;
  zh: string;
  en: string;
  ru: string;
  category: string;
  updatedAt: string;
}

// ============================================================================
// Translation Database
// ============================================================================

export const TRANSLATIONS: Translation[] = [
  // Navigation
  {
    key: 'nav.home',
    zh: '首页',
    en: 'Home',
    ru: 'Главная',
    category: 'navigation',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'nav.order',
    zh: '点单',
    en: 'Order',
    ru: 'Меню',
    category: 'navigation',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'nav.mall',
    zh: '商城',
    en: 'Mall',
    ru: 'Маркет',
    category: 'navigation',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'nav.orders',
    zh: '订单',
    en: 'Orders',
    ru: 'Заказы',
    category: 'navigation',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'nav.profile',
    zh: '我的',
    en: 'Profile',
    ru: 'Профиль',
    category: 'navigation',
    updatedAt: new Date().toISOString(),
  },
  
  // Common
  {
    key: 'common.add_to_cart',
    zh: '加入购物车',
    en: 'Add to Cart',
    ru: 'В корзину',
    category: 'common',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'common.checkout',
    zh: '结算',
    en: 'Checkout',
    ru: 'Оформить',
    category: 'common',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'common.total',
    zh: '总计',
    en: 'Total',
    ru: 'Итого',
    category: 'common',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'common.confirm',
    zh: '确认',
    en: 'Confirm',
    ru: 'Подтвердить',
    category: 'common',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'common.cancel',
    zh: '取消',
    en: 'Cancel',
    ru: 'Отмена',
    category: 'common',
    updatedAt: new Date().toISOString(),
  },
  
  // Order Status
  {
    key: 'order.status.pending',
    zh: '待支付',
    en: 'Pending',
    ru: 'Ожидание',
    category: 'order',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'order.status.paid',
    zh: '已支付',
    en: 'Paid',
    ru: 'Оплачен',
    category: 'order',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'order.status.completed',
    zh: '已完成',
    en: 'Completed',
    ru: 'Завершен',
    category: 'order',
    updatedAt: new Date().toISOString(),
  },
  {
    key: 'order.status.voided',
    zh: '已退款',
    en: 'Refunded',
    ru: 'Возврат',
    category: 'order',
    updatedAt: new Date().toISOString(),
  },
];

// ============================================================================
// Functions
// ============================================================================

/**
 * Get translation by key and language
 */
export function translate(key: string, lang: Language): string {
  const translation = TRANSLATIONS.find(t => t.key === key);
  
  if (!translation) {
    console.warn(`[i18n] Translation not found: ${key}`);
    return key;
  }
  
  return translation[lang];
}

/**
 * Get all translations for a language
 */
export function getAllTranslations(lang: Language): Record<string, string> {
  const result: Record<string, string> = {};
  
  TRANSLATIONS.forEach(t => {
    result[t.key] = t[lang];
  });
  
  return result;
}

/**
 * Get translations by category
 */
export function getTranslationsByCategory(category: string): Translation[] {
  return TRANSLATIONS.filter(t => t.category === category);
}

/**
 * Add or update translation
 */
export function upsertTranslation(translation: Omit<Translation, 'updatedAt'>): Translation {
  const existing = TRANSLATIONS.find(t => t.key === translation.key);
  
  if (existing) {
    Object.assign(existing, translation);
    existing.updatedAt = new Date().toISOString();
    console.log(`[i18n] Translation updated: ${translation.key}`);
    return existing;
  } else {
    const newTranslation: Translation = {
      ...translation,
      updatedAt: new Date().toISOString(),
    };
    TRANSLATIONS.push(newTranslation);
    console.log(`[i18n] Translation added: ${translation.key}`);
    return newTranslation;
  }
}

/**
 * Delete translation
 */
export function deleteTranslation(key: string): boolean {
  const index = TRANSLATIONS.findIndex(t => t.key === key);
  
  if (index === -1) {
    return false;
  }
  
  TRANSLATIONS.splice(index, 1);
  console.log(`[i18n] Translation deleted: ${key}`);
  
  return true;
}

/**
 * Export translations to JSON
 */
export function exportTranslations(lang: Language): string {
  const translations = getAllTranslations(lang);
  return JSON.stringify(translations, null, 2);
}

/**
 * Import translations from JSON
 */
export function importTranslations(lang: Language, json: string): number {
  try {
    const data = JSON.parse(json);
    let count = 0;
    
    Object.entries(data).forEach(([key, value]) => {
      const existing = TRANSLATIONS.find(t => t.key === key);
      
      if (existing) {
        existing[lang] = value as string;
        existing.updatedAt = new Date().toISOString();
      } else {
        // Create new translation with empty values for other languages
        const newTranslation: Translation = {
          key,
          zh: lang === 'zh' ? (value as string) : '',
          en: lang === 'en' ? (value as string) : '',
          ru: lang === 'ru' ? (value as string) : '',
          category: 'imported',
          updatedAt: new Date().toISOString(),
        };
        TRANSLATIONS.push(newTranslation);
      }
      
      count++;
    });
    
    console.log(`[i18n] Imported ${count} translations for ${lang}`);
    return count;
  } catch (error) {
    console.error('[i18n] Import error:', error);
    return 0;
  }
}
