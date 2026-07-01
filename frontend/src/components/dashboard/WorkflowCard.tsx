"use client";

import { Play, BarChart3, Clock } from "lucide-react";
import { Card, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Workflow } from "@/types";
import { formatDate } from "@/lib/utils";

interface WorkflowCardProps {
  workflow: Workflow;
  onRun?: (id: string) => void;
}

const statusConfig = {
  active: { variant: "success" as const, label: "Active" },
  draft: { variant: "warning" as const, label: "Draft" },
  error: { variant: "danger" as const, label: "Error" },
};

export function WorkflowCard({ workflow, onRun }: WorkflowCardProps) {
  const statusLabel = workflow.status || (workflow.is_active ? "active" : "draft");
  const status = statusConfig[statusLabel];

  return (
    <Card variant="glass" className="group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-brand-500/[0.03] to-transparent pointer-events-none" />

      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100 truncate group-hover:text-brand-400 transition-colors duration-150">
            {workflow.name}
          </h3>
        </div>
        <Badge variant={status.variant} size="sm">
          {status.label}
        </Badge>
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 mb-3">
        {workflow.description}
      </p>
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        {workflow.run_count !== undefined && (
          <span className="flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            {workflow.run_count.toLocaleString()} runs
          </span>
        )}
        {workflow.last_run && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(workflow.last_run)}
          </span>
        )}
      </div>
      <CardFooter>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onRun?.(workflow.id)}
            icon={<Play className="h-3.5 w-3.5" />}
          >
            Run
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
