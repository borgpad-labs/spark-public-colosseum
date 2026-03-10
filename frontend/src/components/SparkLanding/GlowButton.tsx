'use client';

import { ReactNode } from 'react';
import { cn } from '../../utils/sparkUtils';

interface GlowButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary';
  icon?: ReactNode;
}

export default function GlowButton({ 
  children, 
  onClick, 
  className, 
  variant = 'secondary',
  icon 
}: GlowButtonProps) {
  const baseClasses = "relative px-8 py-2 md:py-3 rounded-full font-bold text-sm md:text-xl transition-all duration-200 ease-out overflow-hidden group transform";
  
  const variantClasses = {
    primary: "bg-transparent text-[#F19404] hover:bg-[#F19404]/10 shadow-lg shadow-[#F25C05]/25 hover:shadow-[#F25C05]/40 hover:shadow-xl",
    secondary: "bg-transparent text-[#F19404] hover:bg-[#F19404]/10 backdrop-blur-sm"
  };

  return (
    <button
      onClick={onClick}
      className={cn(baseClasses, variantClasses[variant], className, "hover:scale-105 active:scale-95")}
    >
      {/* Content */}
      <div className="relative flex items-center gap-2 justify-center font-satoshi font-bold h-full">
        {icon}
        {children}
      </div>
    </button>
  );
}
