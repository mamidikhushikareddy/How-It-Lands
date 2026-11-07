/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Universal safe environment variable retriever.
 * Works seamlessly in Vite browser bundle, SSR, and tsx/Node headless test environments.
 */
export function getAnalyticsEnv(key: string): string | undefined {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch {
    // Ignore in environments where import.meta.env is restricted
  }

  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch {
    // Ignore in non-Node environments
  }

  return undefined;
}
