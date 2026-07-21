/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CONFIG } from './config';

export class APIError extends Error {
  status: number;
  gateType?: string;
  error?: string;

  constructor(message: string, status: number, gateType?: string, errorDetail?: string) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.gateType = gateType;
    this.error = errorDetail;
  }
}

/**
 * Robust Centralized HTTP Client for enterprise service synchronization.
 */
class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = 2
  ): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(endpoint, config);

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (_) {
          // Fallback if not json
        }
        
        throw new APIError(
          errorData.error || `HTTP error! status: ${response.status}`,
          response.status,
          errorData.gateType,
          errorData.error
        );
      }

      // If no content, return empty object/cast
      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (error: any) {
      if (retries > 0 && !(error instanceof APIError)) {
        console.warn(`API Request failed. Retrying... (${retries} attempts left)`);
        return this.request<T>(endpoint, options, retries - 1);
      }
      
      // Log formatted security and tracing events silently
      console.error(`[API ERROR] Path: ${endpoint} | Message: ${error.message}`);
      throw error;
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
export default api;
