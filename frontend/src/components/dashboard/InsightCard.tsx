"use client";

import { Card } from "@/components/ui/Card";
import type { AIInsight } from "@/types";
import { formatDate } from "@/lib/utils";

interface InsightCardProps {
  insight: AIInsight;
}

const typeConfig = {
  extraction: { label: "Extraction", color: "text-emerald-400" },
  summary: { label: "Summary", color: "text-sky-400" },
  classification: { label: "Classification", color: "text-amber-400" },
};

export function InsightCard({ insight }: InsightCardProps) {
  const { label, color } = typeConfig[insight.type];

  return (
    <Card variant="glass" hover={false} className="cursor-default">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${color}`}>
            {label}
          </span>
          <span className="text-xs text-zinc-600">&middot;</span>
          <span className="text-xs text-zinc-600">{formatDate(insight.created_at)}</span>
        </div>
        <h4 className="text-sm font-medium text-zinc-100">{insight.title}</h4>
        <p className="text-sm text-zinc-400 leading-relaxed">
          {insight.description}
        </p>
      </div>
    </Card>
  );
}
