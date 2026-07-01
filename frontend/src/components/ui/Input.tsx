"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-zinc-400 transition-colors duration-150 peer-focus-within:text-zinc-300">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none transition-colors duration-150 has-[~.peer:focus]:text-zinc-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "peer w-full rounded-lg border bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500",
              "transition-all duration-150",
              "focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10",
              error
                ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/20"
                : "border-zinc-800/60 hover:border-zinc-700/60",
              icon && "pl-10",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-red-400 animate-slide-down">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
