/**
 * 语言上下文
 * 
 * 实现【系统负责人中心化模式】：
 * - 优先加载数据库中已发布的翻译
 * - 静态翻译文件作为 fallback
 * - 支持动态更新翻译
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, DEFAULT_LANGUAGE } from '@/lib/i18n';
import zhTranslations from '@/locales/zh.json';
import ruTranslations from '@/locales/ru.json';
import enTranslations from '@/locales/en.json';

// 静态翻译（fallback）
const staticTranslations = {
  zh: zhTranslations,
  ru: ruTranslations,
  en: enTranslations
};

// 动态翻译缓存
let dynamicTranslationsCache: Record<string, { zh: string; ru: string; en: string }> = {};
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  translations: typeof staticTranslations;
  refreshTranslations: () => Promise<void>;
  isLoadingTranslations: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [dynamicTranslations, setDynamicTranslations] = useState<Record<string, { zh: string; ru: string; en: string }>>({});
  const [isLoadingTranslations, setIsLoadingTranslations] = useState(false);

  // 从 localStorage 加载语言设置
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && ['zh', 'ru', 'en'].includes(savedLanguage)) {
      setLanguageState(savedLanguage);
    }
  }, []);

  // 加载已发布的动态翻译
  const fetchPublishedTranslations = useCallback(async () => {
    // 检查缓存是否有效
    const now = Date.now();
    if (dynamicTranslationsCache && Object.keys(dynamicTranslationsCache).length > 0 && now - lastFetchTime < CACHE_TTL) {
      setDynamicTranslations(dynamicTranslationsCache);
      return;
    }

    setIsLoadingTranslations(true);
    try {
      // 调用 API 获取已发布翻译
      const response = await fetch('/api/trpc/translation.getPublished', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result?.data?.translations) {
          dynamicTranslationsCache = data.result.data.translations;
          lastFetchTime = now;
          setDynamicTranslations(dynamicTranslationsCache);
        }
      }
    } catch (error) {
      console.warn('[LanguageContext] Failed to fetch dynamic translations:', error);
      // 静默失败，使用静态翻译作为 fallback
    } finally {
      setIsLoadingTranslations(false);
    }
  }, []);

  // 初始化时加载动态翻译
  useEffect(() => {
    fetchPublishedTranslations();
  }, [fetchPublishedTranslations]);

  // 保存语言设置到 localStorage
  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  // 刷新翻译
  const refreshTranslations = async () => {
    lastFetchTime = 0; // 强制刷新
    await fetchPublishedTranslations();
  };

  /**
   * 翻译函数（支持参数替换）
   * 
   * 优先级：
   * 1. 动态翻译（数据库中已发布的翻译）
   * 2. 静态翻译（locales/*.json）
   * 3. 返回原始 key
   */
  const t = (key: string, params?: Record<string, string | number>): string => {
    let translation: string;

    // 1. 尝试从动态翻译获取
    if (dynamicTranslations[key]) {
      translation = dynamicTranslations[key][language] || dynamicTranslations[key].zh || key;
    }
    // 2. 尝试从静态翻译获取
    else {
      translation = staticTranslations[language][key as keyof typeof staticTranslations[typeof language]] || key;
    }

    // 参数替换
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        translation = translation.replace(new RegExp(`\\$\\{${k}\\}`, 'g'), String(v));
      });
    }

    return translation;
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t, 
      translations: staticTranslations,
      refreshTranslations,
      isLoadingTranslations,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
