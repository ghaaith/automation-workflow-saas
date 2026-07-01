"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  iconColor?: string;
  trend?: { value: string; positive: boolean };
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = "text-brand-400 bg-brand-500/10",
  trend,
}: StatsCardProps) {
  const [iconBg, iconText] = iconColor.split(" ");

  return (
    <div className="rounded-xl glass-card p-4 group">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{title}</span>
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:scale-110",
          iconBg, iconText
        )}>
          {icon}
        </div>
      </div>
      <div className="space-y-0.5">
        <div className="text-2xl font-semibold text-zinc-100 tracking-tight transition-all duration-200 group-hover:text-white">
          {value}
        </div>
        <div className="flex items-center gap-2">
          {subtitle && (
            <span className="text-xs text-zinc-500">{subtitle}</span>
          )}
          {trend && (
            <span
              className={cn(
                "text-xs font-medium",
                trend.positive ? "text-emerald-400" : "text-red-400"
              )}
            >
              {trend.value}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
