"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import {
  GitBranch,
  FileText,
  Brain,
  Activity,
  Plus,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { WorkflowCard } from "@/components/dashboard/WorkflowCard";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workflowsApi, documentsApi, insightsApi } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { Document } from "@/types";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { organization } = useStore();
  const orgId = organization?.id;

  const triggerMutation = useMutation({
    mutationFn: (id: string) => workflowsApi.trigger(id),
    onSuccess: () => {
      toast.success("Workflow triggered! Execution started in background.");
      queryClient.invalidateQueries({ queryKey: ["workflow-runs"] });
    },
    onError: () => {
      toast.error("Failed to trigger workflow");
    },
  });

  const handleRunWorkflow = (id: string) => {
    triggerMutation.mutate(id);
  };

  const { data: workflows = [], isLoading: wfLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => workflowsApi.list().then((r) => r.data.workflows),
  });

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ["documents", orgId],
    queryFn: () => documentsApi.list(orgId!).then((r) => r.data) as Promise<Document[]>,
    enabled: !!orgId,
  });

  const { data: insights = [] } = useQuery({
    queryKey: ["insights", orgId],
    queryFn: () => insightsApi.list(orgId!).then((r) => r.data),
    enabled: !!orgId,
  });

  const activeWorkflows = workflows.filter((w) => w.status === "active");
  const totalRuns = workflows.reduce((sum, w) => sum + (w.run_count || 0), 0);
  const processedDocs = documents.filter((d) => d.status === "done");

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Dashboard</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Overview of your workflows, documents, and AI insights
            </p>
          </div>
          <Button
            onClick={() => router.push("/dashboard/workflows")}
            icon={<Plus className="h-4 w-4" />}
          >
            New Workflow
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Active Workflows"
            value={activeWorkflows.length}
            subtitle={`${workflows.length} total`}
            icon={<GitBranch className="h-5 w-5" />}
            trend={{ value: "+12%", positive: true }}
          />
          <StatsCard
            title="Documents Processed"
            value={processedDocs.length}
            subtitle={`${documents.length} uploaded`}
            icon={<FileText className="h-5 w-5" />}
            trend={{ value: "+8%", positive: true }}
          />
          <StatsCard
            title="AI Insights"
            value={insights.length}
            subtitle="Generated this month"
            icon={<Brain className="h-5 w-5" />}
            trend={{ value: "+24%", positive: true }}
          />
          <StatsCard
            title="Total Runs"
            value={totalRuns.toLocaleString()}
            subtitle="All time"
            icon={<Activity className="h-5 w-5" />}
            trend={{ value: "+18%", positive: true }}
          />
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-100">Your Workflows</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/workflows")}
            >
              View all
            </Button>
          </div>

          {wfLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : workflows.length === 0 ? (
            <EmptyState
              icon={<GitBranch className="h-8 w-8" />}
              title="No workflows yet"
              description="Create your first workflow to start automating your business processes."
              action={
                <Button onClick={() => router.push("/dashboard/workflows")}>
                  Create Workflow
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.slice(0, 6).map((wf) => (
                <motion.div
                  key={wf.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <WorkflowCard workflow={wf} onRun={handleRunWorkflow} />
                </motion.div>
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <h2 className="text-sm font-semibold text-zinc-100 mb-4">
              AI Insights
            </h2>
            {insights.length === 0 ? (
              <EmptyState
                icon={<Brain className="h-8 w-8" />}
                title="No insights yet"
                description="Insights will appear here once your workflows process documents."
              />
            ) : (
              <div className="space-y-3">
                {insights.slice(0, 3).map((insight) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-100">
                Recent Activity
              </h2>
            </div>
            <EmptyState
              icon={<Activity className="h-8 w-8" />}
              title="No recent activity"
              description="Workflow runs will appear here."
            />
          </section>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
