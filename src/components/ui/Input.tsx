/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-xs text-[#B5B8BE]/60 font-sans tracking-wide block">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full p-3 bg-[#0a0a0a] border border-[#262626] focus:border-[#00E5FF]/50 rounded-xl text-xs text-[#FAF8F5] focus:outline-none placeholder-[#444] transition-all duration-200 ${
            error ? 'border-red-900/50 focus:border-red-500/50' : ''
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="text-[10px] text-red-400 font-sans mt-0.5">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
