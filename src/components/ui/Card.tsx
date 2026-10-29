/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  children?: React.ReactNode;
}

export function Card({
  children,
  hoverable = false,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-[#151B28] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm transition-all duration-200 ${
        hoverable ? 'hover:border-slate-300 dark:hover:border-white/20 hover:shadow-md cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
