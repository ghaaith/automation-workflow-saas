"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

const variants = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 shadow-sm shadow-brand-500/10",
  secondary:
    "glass-card-static text-zinc-100 hover:bg-zinc-700/70 border border-zinc-700/50 active:bg-zinc-700/80",
  ghost:
    "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 active:bg-zinc-800/80",
  outline:
    "border border-zinc-700/60 text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100 hover:border-zinc-600 active:bg-zinc-800",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm shadow-red-500/10",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, icon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-1 focus:ring-offset-zinc-950",
          "disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none",
          "active:scale-[0.97]",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : icon ? (
          <span className="transition-transform duration-150 group-hover:scale-110">{icon}</span>
        ) : null}
        {children && <span>{children}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
