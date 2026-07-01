"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Upload, Sparkles, GitBranch, Send, Trash2 } from "lucide-react";
import type { BuilderNodeType } from "@/types";

export interface BuilderNodeData extends Record<string, unknown> {
  label: string;
  nodeType: BuilderNodeType;
  config: Record<string, unknown>;
  onDelete?: (id: string) => void;
}

export type BuilderNodeType_RF = Node<BuilderNodeData, BuilderNodeType>;

const nodeStyle: Record<BuilderNodeType, { bg: string; border: string; text: string; accent: string; accentBg: string; iconBg: string }> = {
  trigger: {
    bg: "bg-zinc-900/80",
    border: "border-emerald-500/25",
    text: "text-emerald-400",
    accent: "bg-emerald-500",
    accentBg: "bg-emerald-500/10",
    iconBg: "bg-emerald-500/15",
  },
  ai_action: {
    bg: "bg-zinc-900/80",
    border: "border-indigo-500/25",
    text: "text-indigo-400",
    accent: "bg-indigo-500",
    accentBg: "bg-indigo-500/10",
    iconBg: "bg-indigo-500/15",
  },
  condition: {
    bg: "bg-zinc-900/80",
    border: "border-amber-500/25",
    text: "text-amber-400",
    accent: "bg-amber-500",
    accentBg: "bg-amber-500/10",
    iconBg: "bg-amber-500/15",
  },
  output: {
    bg: "bg-zinc-900/80",
    border: "border-sky-500/25",
    text: "text-sky-400",
    accent: "bg-sky-500",
    accentBg: "bg-sky-500/10",
    iconBg: "bg-sky-500/15",
  },
};

const iconMap: Record<BuilderNodeType, React.ReactNode> = {
  trigger: <Upload className="h-4 w-4" />,
  ai_action: <Sparkles className="h-4 w-4" />,
  condition: <GitBranch className="h-4 w-4" />,
  output: <Send className="h-4 w-4" />,
};

const handlerLabels: Record<string, string> = {
  trigger_webhook: "Webhook",
  trigger_document_uploaded: "Document Upload",
  ai_extract: "Extract",
  ai_summarize: "Summarize",
  condition: "If / Else",
  send_email: "Email",
  send_slack: "Slack",
  api_call: "API Call",
};

const typeBadgeMap: Record<BuilderNodeType, string> = {
  trigger: "TRIGGER",
  ai_action: "AI",
  condition: "CONDITION",
  output: "OUTPUT",
};

export const BuilderNode = memo(({ id, data, selected }: NodeProps<BuilderNodeType_RF>) => {
  const nodeType = data.nodeType || "trigger";
  const colors = nodeStyle[nodeType] || nodeStyle.trigger;
  const handler = (data.config?.handler as string) || "";
  const handlerLabel = handlerLabels[handler] || "";

  return (
    <div
      className={`rounded-xl border ${colors.border} ${colors.bg} w-64 transition-all duration-200 ${
        selected
          ? "shadow-[0_0_0_1px_rgba(99,102,241,0.5),0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/30"
          : "shadow-sm hover:shadow-md hover:border-zinc-700/50"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-zinc-800 !bg-zinc-900 !-top-3"
      />

      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className={`w-8 h-8 rounded-lg ${colors.iconBg} flex items-center justify-center ${colors.text} shrink-0`}>
              {iconMap[nodeType]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-100 truncate leading-tight">
                  {data.label}
                </span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${colors.accentBg} ${colors.text} leading-none shrink-0`}>
                  {typeBadgeMap[nodeType]}
                </span>
              </div>
              {handlerLabel && (
                <span className="text-[11px] text-zinc-500 mt-0.5 block leading-tight">
                  {handlerLabel}
                </span>
              )}
            </div>
          </div>
          {selected && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onDelete?.(id);
              }}
              className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0 -mr-1 -mt-0.5"
              title="Delete node"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-zinc-800 !bg-zinc-900 !-bottom-3"
      />
    </div>
  );
});

BuilderNode.displayName = "BuilderNode";

export const nodeTypes = {
  trigger: BuilderNode,
  ai_action: BuilderNode,
  condition: BuilderNode,
  output: BuilderNode,
};
