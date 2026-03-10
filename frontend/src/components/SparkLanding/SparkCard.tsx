import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "../../utils/sparkUtils";

interface SparkCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'glass' | 'gradient' | 'glow';
  animated?: boolean;
}

export default function SparkCard({
  children,
  className,
  onClick,
  variant = 'default',
  animated = true
}: SparkCardProps) {
  const baseClasses = "relative rounded-2xl transition-all duration-300 overflow-hidden";
  
  const variantClasses = {
    default: "bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20",
    glass: "bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 hover:border-white/30 shadow-lg shadow-black/10",
    gradient: "bg-gradient-to-br from-white/10 to-white/5 border border-white/20 hover:from-white/15 hover:to-white/10",
    glow: "bg-white/5 border border-orange-500/30 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/20"
  };

  const cardContent = (
    <>
      {/* Spark glow effect for glow variant */}
      {variant === 'glow' && (
        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500">
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 to-amber-600/20 rounded-2xl blur-sm" />
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-10 p-6">
        {children}
      </div>
      
      {/* Hover shine effect */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 -translate-x-full hover:translate-x-full transition-transform duration-1000" />
      </div>
    </>
  );

  if (animated) {
    return (
      <motion.div
        className={cn(
          baseClasses,
          variantClasses[variant],
          onClick && "cursor-pointer hover:scale-[1.02]",
          className
        )}
        onClick={onClick}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        whileHover={{ scale: onClick ? 1.02 : 1 }}
      >
        {cardContent}
      </motion.div>
    );
  }

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        onClick && "cursor-pointer hover:scale-[1.02]",
        className
      )}
      onClick={onClick}
    >
      {cardContent}
    </div>
  );
}
