import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "../../utils/sparkUtils";

interface SparkButtonProps {
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
}

export default function SparkButton({
  children,
  onClick,
  className,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  loading = false
}: SparkButtonProps) {
  const baseClasses = "relative font-semibold rounded-full transition-all duration-300 ease-out overflow-hidden group transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  const variantClasses = {
    primary: "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:shadow-xl",
    secondary: "bg-white/10 backdrop-blur-md border border-white/30 text-neutral-200 hover:bg-white/20 hover:border-white/40",
    ghost: "bg-transparent text-orange-500 hover:bg-orange-500/10",
    outline: "bg-transparent border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        className,
        "hover:scale-105"
      )}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {/* Shine effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>

      {/* Content */}
      <div className="relative flex items-center gap-2 justify-center">
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            {icon}
            {children}
          </>
        )}
      </div>
    </motion.button>
  );
}
