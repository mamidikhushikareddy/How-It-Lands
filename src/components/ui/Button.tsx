/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'minimal' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyle = 'inline-flex items-center justify-center font-mono uppercase font-semibold tracking-wider rounded transition-all duration-200 select-none cursor-pointer';
  
  const variants = {
    primary: 'bg-white hover:bg-white/90 text-[#111315] border border-transparent shadow-sm disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-[#1A1D20] hover:bg-[#222629] text-white hover:text-white border border-white/5 hover:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed',
    danger: 'bg-red-950/20 hover:bg-red-950/40 text-white hover:text-white border border-red-900/30 disabled:opacity-40 disabled:cursor-not-allowed',
    success: 'bg-green-600 hover:bg-green-700 text-white border border-transparent shadow-sm disabled:opacity-50 disabled:cursor-not-allowed',
    minimal: 'text-[#B5B8BE] hover:text-[#FAF8F5] bg-transparent border border-transparent disabled:opacity-30 disabled:cursor-not-allowed'
  };

  const sizes = {
    sm: 'text-[9px] px-2.5 py-1.5',
    md: 'text-[10px] px-4 py-2.5',
    lg: 'text-[11px] px-5 py-3'
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-1.5">
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export default Button;
