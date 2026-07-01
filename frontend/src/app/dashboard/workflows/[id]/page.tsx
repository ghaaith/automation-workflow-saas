"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Edit3,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Loader2,
  FileText,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { workflowsApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import type { NodeExecution } from "@/types";

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [runDetails, setRunDetails] = useState<Record<string, { node_executions: NodeExecution[] }>>({});

  const { data: workflow } = useQuery({
    queryKey: ["workflow", params.id],
    queryFn: () => workflowsApi.get(params.id as string).then((r) => r.data),
  });

  const { data: runs = [] } = useQuery({
    queryKey: ["workflow-runs", params.id],
    queryFn: () => workflowsApi.getRuns(params.id as string).then((r) => r.data),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && data.some((r) => r.status === "pending" || r.status === "running")) {
        return 3000;
      }
      return false;
    },
  });

  const triggerMutation = useMutation({
    mutationFn: () => workflowsApi.trigger(params.id as string),
    onSuccess: () => {
      toast.success("Workflow triggered! Execution started in background.");
      queryClient.invalidateQueries({ queryKey: ["workflow-runs", params.id] });
    },
    onError: () => {
      toast.error("Failed to trigger workflow");
    },
  });

  if (!workflow) return null;

  const statusLabel = workflow.status || (workflow.is_active ? "active" : "draft");
  const statusVariant =
    statusLabel === "active"
      ? "success"
      : statusLabel === "draft"
      ? "warning"
      : "danger";

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <button
          onClick={() => router.push("/dashboard/workflows")}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to workflows
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-100">
                {workflow.name}
              </h1>
              <Badge variant={statusVariant}>
                {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
              </Badge>
            </div>
            <p className="text-sm text-zinc-500 mt-1">
              {workflow.description}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              icon={<Play className="h-4 w-4" />}
              onClick={() => triggerMutation.mutate()}
              loading={triggerMutation.isPending}
            >
              Run
            </Button>
            <Button
              variant="outline"
              icon={<Edit3 className="h-4 w-4" />}
              onClick={() =>
                router.push(`/dashboard/workflows/builder/${workflow.id}`)
              }
            >
              Edit
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card hover={false}>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-zinc-500" />
              <div>
                <p className="text-xs text-zinc-500">Created</p>
                <p className="text-sm text-zinc-300">
                  {formatDate(workflow.created_at)}
                </p>
              </div>
            </div>
          </Card>
          <Card hover={false}>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-zinc-500" />
              <div>
                <p className="text-xs text-zinc-500">Total Runs</p>
                <p className="text-sm text-zinc-300">
                  {workflow.run_count?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </Card>
          <Card hover={false}>
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-zinc-500" />
              <div>
                <p className="text-xs text-zinc-500">Last Run</p>
                <p className="text-sm text-zinc-300">
                  {workflow.last_run
                    ? formatDate(workflow.last_run)
                    : "Never"}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">
            Execution History
          </h2>
          <div className="space-y-3">
            {runs.map((run) => (
              <Card key={run.id} hover={false}>
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={async () => {
                    if (expandedRun === run.id) {
                      setExpandedRun(null);
                    } else {
                      setExpandedRun(run.id);
                      if (!runDetails[run.id]) {
                        try {
                          const res = await workflowsApi.getRun(run.id);
                          setRunDetails((prev) => ({
                            ...prev,
                            [run.id]: res.data,
                          }));
                        } catch {
                          // ignore
                        }
                      }
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        run.status === "completed"
                          ? "bg-emerald-500/10"
                          : run.status === "running"
                          ? "bg-sky-500/10"
                          : "bg-red-500/10"
                      }`}
                    >
                      {run.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : run.status === "running" || run.status === "pending" ? (
                        <Loader2 className="h-4 w-4 text-sky-400 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-zinc-300 font-medium">
                        Run {run.id.slice(-4)}
                      </p>
                      <p className="text-xs text-zinc-600">
                        {new Date(run.started_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        run.status === "completed"
                          ? "success"
                          : run.status === "running"
                          ? "info"
                          : run.status === "pending"
                          ? "warning"
                          : "danger"
                      }
                      size="sm"
                    >
                      {run.status}
                    </Badge>
                    <ChevronDown
                      className={`h-4 w-4 text-zinc-500 transition-transform ${
                        expandedRun === run.id ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>

                {expandedRun === run.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="mt-4 pt-4 border-t border-zinc-800 space-y-3"
                  >
                    {run.logs.length === 0 ? (
                      <p className="text-sm text-zinc-500">No logs recorded</p>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Logs</p>
                        {run.logs.map((log) => (
                          <div
                            key={log.id}
                            className={`flex items-start gap-3 p-2 rounded-lg text-sm ${
                              log.level === "error"
                                ? "bg-red-500/5 text-red-400"
                                : log.level === "warn"
                                ? "bg-amber-500/5 text-amber-400"
                                : "text-zinc-400"
                            }`}
                          >
                            <span className="text-xs font-mono uppercase mt-0.5">
                              {log.level}
                            </span>
                            <span>{log.message}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {runDetails[run.id]?.node_executions?.map((ex) => (
                      <div key={ex.id} className="bg-zinc-900/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Database className="h-3.5 w-3.5 text-zinc-500" />
                          <span className="text-xs font-medium text-zinc-400">
                            Node Output {ex.node_id?.slice(-4) || "?"} ({ex.status})
                          </span>
                        </div>
                        {ex.output_data && Object.keys(ex.output_data).length > 0 ? (
                          <pre className="text-xs text-zinc-300 font-mono bg-zinc-950 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(ex.output_data, null, 2)}
                          </pre>
                        ) : (
                          <p className="text-xs text-zinc-600">No output data</p>
                        )}
                        {ex.error_message && (
                          <p className="text-xs text-red-400">{ex.error_message}</p>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </Card>
            ))}
          </div>
        </section>
      </motion.div>
    </DashboardLayout>
  );
}
