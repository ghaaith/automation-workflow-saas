"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "glass";
  hover?: boolean;
  onClick?: () => void;
}

const variants = {
  default: "border border-zinc-800/50 bg-zinc-900/50",
  glass: "glass-card",
};

export function Card({ children, className, variant = "default", hover = true, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl p-4 transition-all duration-200",
        variants[variant],
        hover && "glass-hover hover:border-zinc-700/80",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-3", className)}>{children}</div>;
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mt-4 pt-3 border-t border-zinc-800/40", className)}>{children}</div>;
}
