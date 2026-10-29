/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'minimal' | 'success' | 'outline';
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
  const baseStyle = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 select-none cursor-pointer disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-[#111418] dark:bg-white text-white dark:text-[#0D0F12] hover:bg-[#23272E] dark:hover:bg-gray-100 shadow-sm border border-transparent disabled:opacity-40',
    secondary: 'bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[#111418] dark:text-[#F3F4F6] border border-black/10 dark:border-white/10 disabled:opacity-40',
    outline: 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-[#111418] dark:text-[#F3F4F6] border border-black/15 dark:border-white/15 disabled:opacity-40',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 disabled:opacity-40',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border border-transparent disabled:opacity-40',
    minimal: 'text-[#5F6775] dark:text-[#9CA3AF] hover:text-[#111418] dark:hover:text-white bg-transparent border border-transparent disabled:opacity-30'
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-xs px-4 py-2 gap-2',
    lg: 'text-sm px-5 py-2.5 gap-2.5'
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
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export default Button;
