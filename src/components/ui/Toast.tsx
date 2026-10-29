/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {}
});

export const useToast = () => useContext(ToastContext);

// Global custom event trigger as a fallback for components without context
export const notify = (message: string, type: ToastType = 'info', title?: string) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('app-toast', {
        detail: { message, type, title }
      })
    );
  }
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev.slice(-3), { id, type, title, message }]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  // Listen to custom events
  React.useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ message: string; type: ToastType; title?: string }>;
      if (custom.detail?.message) {
        showToast(custom.detail.message, custom.detail.type || 'info', custom.detail.title);
      }
    };
    window.addEventListener('app-toast', handler);
    return () => window.removeEventListener('app-toast', handler);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Notification Container */}
      <div 
        aria-live="polite" 
        className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map(toast => {
          const icons = {
            success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />,
            error: <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />,
            warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />,
            info: <Info className="w-4 h-4 text-[#00D2E0] shrink-0 mt-0.5" />
          };

          const borderColors = {
            success: 'border-emerald-500/30 dark:border-emerald-500/30',
            error: 'border-red-500/30 dark:border-red-500/30',
            warning: 'border-amber-500/30 dark:border-amber-500/30',
            info: 'border-[#00D2E0]/30 dark:border-[#00D2E0]/30'
          };

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-3.5 rounded-xl bg-white dark:bg-[#181C21] text-gray-900 dark:text-gray-100 border ${borderColors[toast.type]} shadow-xl flex items-start gap-3 transition-all duration-200 animate-fade-in`}
              role="alert"
            >
              {icons[toast.type]}
              <div className="flex-1 min-w-0 pr-2">
                {toast.title && (
                  <p className="text-xs font-semibold leading-tight mb-0.5">{toast.title}</p>
                )}
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-normal">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition p-0.5 cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
