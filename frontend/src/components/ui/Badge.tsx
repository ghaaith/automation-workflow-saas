import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "purple";
  className?: string;
  size?: "sm" | "md";
}

const variants = {
  default: "bg-zinc-800/60 text-zinc-400",
  success: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20",
  danger: "bg-red-500/10 text-red-400 ring-1 ring-red-500/20",
  info: "bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20",
  purple: "bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20",
};

const sizes = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
};

export function Badge({ children, variant = "default", className, size = "md" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-medium",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {variant !== "default" && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            variant === "success" && "bg-emerald-400",
            variant === "warning" && "bg-amber-400",
            variant === "danger" && "bg-red-400",
            variant === "info" && "bg-sky-400",
            variant === "purple" && "bg-indigo-400"
          )}
        />
      )}
      {children}
    </span>
  );
}
