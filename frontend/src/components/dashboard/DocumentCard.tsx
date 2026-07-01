"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Download,
  Copy,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Document } from "@/types";
import { formatDate, formatFileSize } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface DocumentCardProps {
  document: Document;
  onDelete?: (id: string) => void;
}

const statusConfig = {
  done: { icon: CheckCircle2, variant: "success" as const, label: "Processed" },
  processing: { icon: Clock, variant: "info" as const, label: "Processing" },
  failed: { icon: AlertCircle, variant: "danger" as const, label: "Failed" },
};

const statusColors = {
  done: "text-emerald-400 bg-emerald-500/10 ring-1 ring-emerald-500/20",
  processing: "text-sky-400 bg-sky-500/10 ring-1 ring-sky-500/20",
  failed: "text-red-400 bg-red-500/10 ring-1 ring-red-500/20",
};

export function DocumentCard({ document, onDelete }: DocumentCardProps) {
  const status = statusConfig[document.status];
  const Icon = status.icon;
  const fileExt = document.filename.split('.').pop()?.toUpperCase() || 'FILE';
  const [copied, setCopied] = useState(false);
  const handleCopyId = () => {
    navigator.clipboard.writeText(document.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card variant="glass" className="group relative overflow-hidden">
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-semibold uppercase tracking-wider",
          statusColors[document.status]
        )}>
          {fileExt}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium text-zinc-100 truncate group-hover:text-brand-400 transition-colors duration-150">
                {document.title}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {document.filename} &middot; {formatFileSize(document.file_size)}
              </p>
            </div>
            <Badge variant={status.variant} size="sm">
              <Icon className={cn("h-3 w-3", document.status === "processing" && "animate-spin")} />
              {status.label}
            </Badge>
          </div>

          <div className="flex items-center justify-between mt-2.5">
            <span className="text-xs text-zinc-600">
              Uploaded {formatDate(document.created_at)}
            </span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-150">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyId}
                icon={<Copy className="h-3.5 w-3.5" />}
                title={copied ? "Copied!" : "Copy document ID"}
              />
              {document.status === "done" && (
                <Button size="sm" variant="ghost" icon={<Download className="h-3.5 w-3.5" />} />
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete?.(document.id)}
                icon={<Trash2 className="h-3.5 w-3.5 text-zinc-500 group-hover:text-red-400 transition-colors duration-150" />}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
