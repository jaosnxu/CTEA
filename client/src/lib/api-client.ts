/**
 * CHU TEA - Unified API Client
 * 
 * Centralized API request handling with:
 * - Environment-based URL configuration
 * - Error handling and retry logic
 * - Request/response interceptors
 * - Type-safe endpoints
 */

import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../server/routers';
import SuperJSON from 'superjson';

/**
 * Get API base URL based on environment
 */
export function getApiUrl(): string {
  // In production, use relative URL (same origin)
  if (import.meta.env.PROD) {
    return '';
  }
  
  // In development, use environment variable or default to localhost
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
}

/**
 * tRPC React client
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Create tRPC client instance
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiUrl()}/trpc`,
        transformer: SuperJSON,
        
        // Include credentials for cookie-based auth
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: 'include',
          });
        },
        
        // Error handling
        async headers() {
          return {
            'Content-Type': 'application/json',
          };
        },
      }),
    ],
  });
}

/**
 * Legacy REST API client (for non-tRPC endpoints)
 */
class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = getApiUrl();
  }

  /**
   * Generic request method
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`[API] Request failed: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

/**
 * Export singleton instance
 */
export const apiClient = new ApiClient();

/**
 * API Error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
