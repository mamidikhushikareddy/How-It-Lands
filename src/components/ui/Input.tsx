/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full text-left">
        {label && (
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-3.5 py-2.5 bg-white dark:bg-[#14171B] border border-black/15 dark:border-white/10 rounded-lg text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00D2E0]/40 focus:border-[#00D2E0] transition-all duration-150 ${
            error ? 'border-red-500 focus:ring-red-400/40 focus:border-red-500' : ''
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="text-[11px] text-red-500 dark:text-red-400 mt-1">{error}</p>
        )}
        {!error && helperText && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
