/**
 * CHUTEA 智慧中台 - 认证上下文 (AuthContext)
 * 
 * 功能：
 * 1. JWT Token 持久化存储（localStorage）
 * 2. 自动登录（页面刷新后恢复登录状态）
 * 3. 自动附加 Token 到 API 请求
 * 4. Token 过期处理
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// ==================== 类型定义 ====================

/** 用户信息 */
export interface User {
  id: number;
  phone: string;
  nickname: string | null;
  avatar: string | null;
}

/** 认证上下文类型 */
interface AuthContextType {
  /** 当前用户 */
  user: User | null;
  /** JWT Token */
  token: string | null;
  /** 是否已认证 */
  isAuthenticated: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 登录 */
  login: (token: string, user: User) => Promise<void>;
  /** 登出 */
  logout: () => Promise<void>;
  /** 更新用户信息 */
  updateUser: (updates: Partial<User>) => void;
  /** 刷新 Token */
  refreshToken: () => Promise<boolean>;
}

// ==================== 常量配置 ====================

/** localStorage 键名 */
const STORAGE_KEY_TOKEN = 'chutea_token';
const STORAGE_KEY_USER = 'chutea_user';

/** Token 刷新阈值（提前 1 天刷新） */
const TOKEN_REFRESH_THRESHOLD = 24 * 60 * 60 * 1000;

// ==================== 上下文创建 ====================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ==================== Provider 组件 ====================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  /**
   * 解析 JWT Token
   */
  const parseToken = useCallback((token: string): { userId: number; phone: string; exp: number } | null => {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch {
      return null;
    }
  }, []);
  
  /**
   * 检查 Token 是否过期
   */
  const isTokenExpired = useCallback((token: string): boolean => {
    const payload = parseToken(token);
    if (!payload) return true;
    return payload.exp * 1000 < Date.now();
  }, [parseToken]);
  
  /**
   * 检查 Token 是否需要刷新
   */
  const shouldRefreshToken = useCallback((token: string): boolean => {
    const payload = parseToken(token);
    if (!payload) return false;
    return payload.exp * 1000 - Date.now() < TOKEN_REFRESH_THRESHOLD;
  }, [parseToken]);
  
  /**
   * 初始化：从 localStorage 恢复登录状态
   */
  useEffect(() => {
    const initAuth = async () => {
      console.log('[AuthContext] 🔄 初始化认证状态...');
      
      try {
        const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
        const storedUser = localStorage.getItem(STORAGE_KEY_USER);
        
        if (storedToken && storedUser) {
          // 检查 Token 是否过期
          if (isTokenExpired(storedToken)) {
            console.log('[AuthContext] ⚠️ Token 已过期，清除登录状态');
            localStorage.removeItem(STORAGE_KEY_TOKEN);
            localStorage.removeItem(STORAGE_KEY_USER);
          } else {
            console.log('[AuthContext] ✅ 恢复登录状态');
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            
            // 检查是否需要刷新 Token
            if (shouldRefreshToken(storedToken)) {
              console.log('[AuthContext] 🔄 Token 即将过期，尝试刷新...');
              // 异步刷新，不阻塞初始化
              refreshTokenInternal(storedToken);
            }
          }
        } else {
          console.log('[AuthContext] ℹ️ 未找到登录状态');
        }
      } catch (error) {
        console.error('[AuthContext] 初始化失败:', error);
        localStorage.removeItem(STORAGE_KEY_TOKEN);
        localStorage.removeItem(STORAGE_KEY_USER);
      } finally {
        setIsLoading(false);
      }
    };
    
    initAuth();
  }, [isTokenExpired, shouldRefreshToken]);
  
  /**
   * 内部刷新 Token 方法
   */
  const refreshTokenInternal = async (currentToken: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success && data.data?.token) {
        console.log('[AuthContext] ✅ Token 刷新成功');
        setToken(data.data.token);
        localStorage.setItem(STORAGE_KEY_TOKEN, data.data.token);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[AuthContext] Token 刷新失败:', error);
      return false;
    }
  };
  
  /**
   * 登录
   */
  const login = useCallback(async (newToken: string, newUser: User) => {
    console.log('[AuthContext] 🔐 登录', { userId: newUser.id });
    
    setToken(newToken);
    setUser(newUser);
    
    // 持久化存储
    localStorage.setItem(STORAGE_KEY_TOKEN, newToken);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
  }, []);
  
  /**
   * 登出
   */
  const logout = useCallback(async () => {
    console.log('[AuthContext] 🚪 登出');
    
    // 调用后端登出接口（可选）
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch {
        // 忽略错误
      }
    }
    
    // 清除状态
    setToken(null);
    setUser(null);
    
    // 清除存储
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
  }, [token]);
  
  /**
   * 更新用户信息
   */
  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
      return updated;
    });
  }, []);
  
  /**
   * 刷新 Token（公开方法）
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!token) return false;
    return refreshTokenInternal(token);
  }, [token]);
  
  // ==================== 上下文值 ====================
  
  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    updateUser,
    refreshToken,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ==================== Hook ====================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ==================== 工具函数 ====================

/**
 * 获取存储的 Token（用于 API 请求）
 */
export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEY_TOKEN);
}

/**
 * 创建带认证的 fetch 函数
 */
export function createAuthFetch() {
  return async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = getStoredToken();
    
    const headers = new Headers(options.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Accept-Language', 'ru');
    
    return fetch(url, {
      ...options,
      headers,
    });
  };
}

export default AuthContext;
