"use client";

import { useCallback, type DragEvent } from "react";
import { Upload, Sparkles, GitBranch, Send } from "lucide-react";
import type { BuilderNodeType } from "@/types";

interface BlockDef {
  type: BuilderNodeType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const blockTypes: BlockDef[] = [
  {
    type: "trigger",
    label: "Trigger",
    description: "Document upload, webhook",
    icon: <Upload className="h-4 w-4" />,
  },
  {
    type: "ai_action",
    label: "AI Action",
    description: "Extract, summarize, classify",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    type: "condition",
    label: "Condition",
    description: "If / else branching",
    icon: <GitBranch className="h-4 w-4" />,
  },
  {
    type: "output",
    label: "Output",
    description: "Slack, email, API call",
    icon: <Send className="h-4 w-4" />,
  },
];

export function NodeSidebar() {
  const onDragStart = useCallback(
    (e: DragEvent, type: BuilderNodeType) => {
      e.dataTransfer.setData("application/reactflow-type", type);
      e.dataTransfer.effectAllowed = "copy";
    },
    []
  );

  return (
    <aside className="w-56 border-r border-zinc-800/50 bg-zinc-950/50 flex flex-col overflow-y-auto">
      <div className="p-3 border-b border-zinc-800/30">
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold">
          Node Library
        </p>
      </div>
      <div className="p-2.5 space-y-1.5 flex-1">
        {blockTypes.map((block) => (
          <div
            key={block.type}
            draggable
            onDragStart={(e) => onDragStart(e, block.type)}
            className="group cursor-grab active:cursor-grabbing"
          >
            <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-2.5 hover:border-zinc-700/60 hover:bg-zinc-900/80 transition-all duration-150">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-zinc-800/70 flex items-center justify-center text-zinc-400 shrink-0 group-hover:text-zinc-300 transition-colors">
                  {block.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-300 group-hover:text-zinc-200 transition-colors">
                    {block.label}
                  </p>
                  <p className="text-[10px] text-zinc-600 truncate">
                    {block.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-zinc-800/30">
        <p className="text-[10px] text-zinc-700 leading-relaxed">
          Drag nodes onto the canvas. Connect them by dragging between handles.
        </p>
      </div>
    </aside>
  );
}
