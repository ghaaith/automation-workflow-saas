"use client";

import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { WorkflowRun } from "@/types";

const statusConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; label: string }> = {
  completed: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "completed" },
  running: { icon: Loader2, color: "text-sky-400", bg: "bg-sky-500/10", label: "started" },
  failed: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", label: "failed" },
  pending: { icon: Loader2, color: "text-zinc-400", bg: "bg-zinc-500/10", label: "queued" },
};

export function ActivityFeed({ runs }: { runs: WorkflowRun[] }) {
  return (
    <div className="space-y-2">
      {runs.map((run) => {
        const status = statusConfig[run.status];
        const Icon = status.icon;

        return (
          <Card key={run.id} variant="glass" hover={false} className="flex items-center gap-3 py-2.5 cursor-default">
            <div className={`w-8 h-8 rounded-lg ${status.bg} flex items-center justify-center shrink-0`}>
              <Icon className={`h-4 w-4 ${status.color} ${run.status === "running" ? "animate-spin" : ""}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-300 truncate">
                Workflow {status.label}
              </p>
              <p className="text-xs text-zinc-600">
                {new Date(run.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <span className={`text-[11px] font-medium ${status.color}`}>
              {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
            </span>
          </Card>
        );
      })}
    </div>
  );
}
