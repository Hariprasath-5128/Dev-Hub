"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20",
        destructive: "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20",
        cool: "bg-gradient-to-t from-blue-600 to-blue-400 border border-b-2 border-blue-900/20 text-white shadow-lg shadow-blue-500/30 hover:brightness-110",
        outline: "border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 shadow-sm",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
        ghost: "hover:bg-slate-100 text-slate-600",
        link: "text-blue-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-full px-4 text-xs",
        lg: "h-12 rounded-full px-10 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <motion.button
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95, y: 0 }}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </motion.button>
    )
  }
)
Button.displayName = "Button"

export function ShinyButton({
  className,
  children,
  variant = 'blue',
  icon,
  ...props
}) {
  const glowVariants = {
    blue: 'border-blue-500/30 text-blue-400 hover:text-blue-300',
    green: 'border-emerald-500/30 text-emerald-400 hover:text-emerald-300',
    pink: 'border-pink-500/30 text-pink-400 hover:text-pink-300',
    white: 'border-white/20 text-slate-300 hover:text-white',
  };

  const internalGlows = {
    blue: 'bg-blue-500/10',
    green: 'bg-emerald-500/10',
    pink: 'bg-pink-500/10',
    white: 'bg-white/5',
  };

  const glowColors = {
    blue: 'rgba(59, 130, 246, 0.5)',
    green: 'rgba(16, 185, 129, 0.5)',
    pink: 'rgba(236, 72, 153, 0.5)',
    white: 'rgba(255, 255, 255, 0.3)',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.04, y: -1 }}
      whileTap={{ scale: 0.96, y: 0 }}
      className={cn(
        'relative flex items-center justify-center gap-2.5 px-7 py-2.5 rounded-full',
        'bg-white/5 backdrop-blur-xl border-[1px] shadow-sm',
        'font-bold tracking-tight transition-all duration-500',
        'group overflow-hidden isolate',
        glowVariants[variant] || glowVariants.blue,
        className
      )}
      {...props}
    >
      {/* Internal "Inside the Box" Hover Light */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        className={cn(
          "absolute inset-0 z-0 transition-opacity duration-500",
          internalGlows[variant] || internalGlows.blue
        )}
      />

      {/* Animated Glowing Boundary Overlay (Bottom Ridge) */}
      <div 
        className="absolute inset-x-0 bottom-0 h-[1.5px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-r from-transparent via-current to-transparent"
        style={{ 
          filter: `drop-shadow(0 0 8px ${glowColors[variant]})`,
        }}
      />
      
      {/* Soft Inner Polish */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-10 pointer-events-none" />

      {icon}
      <span className="relative z-10 drop-shadow-sm select-none">
        {children}
      </span>
    </motion.button>
  );
}

export { Button, buttonVariants }
