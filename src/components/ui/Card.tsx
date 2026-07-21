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
      className={`bg-[#1A1D20] border border-white/5 p-6 rounded-xl shadow-lg relative overflow-hidden transition-all duration-200 ${
        hoverable ? 'hover:border-white/10 hover:shadow-xl cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
