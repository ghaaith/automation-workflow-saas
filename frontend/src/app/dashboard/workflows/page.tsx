"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { GitBranch, Plus, Search } from "lucide-react";
import { WorkflowCard } from "@/components/dashboard/WorkflowCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { workflowsApi } from "@/lib/api";
import { useStore } from "@/lib/store";
import toast from "react-hot-toast";

const filters = ["All", "Active", "Draft", "Error"] as const;

export default function WorkflowsPage() {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
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

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => workflowsApi.list().then((r) => r.data.workflows),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      workflowsApi.create(data).then((r) => r.data),
    onSuccess: (wf) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      setShowCreateModal(false);
      setNewTitle("");
      setNewDesc("");
      toast.success("Workflow created!");
      router.push(`/dashboard/workflows/builder/${wf.id}`);
    },
  });

  const filtered = workflows.filter((wf) => {
    const matchFilter =
      activeFilter === "All" || (wf.status || (wf.is_active ? "active" : "draft")).toLowerCase() === activeFilter.toLowerCase();
    const matchSearch =
      !searchQuery ||
      wf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wf.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFilter && matchSearch;
  });

  const handleRun = (id: string) => {
    triggerMutation.mutate(id);
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Workflows</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Create and manage your automation workflows
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} icon={<Plus className="h-4 w-4" />}>
            New Workflow
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-1.5 flex-wrap">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                  activeFilter === filter
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-300 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<GitBranch className="h-8 w-8" />}
            title={
              searchQuery
                ? "No workflows match your search"
                : "No workflows yet"
            }
            description={
              searchQuery
                ? "Try adjusting your search or filters"
                : "Create your first workflow to start automating."
            }
            action={
              !searchQuery ? (
                <Button onClick={() => setShowCreateModal(true)}>
                  Create Workflow
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((wf) => (
              <motion.div
                key={wf.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => router.push(`/dashboard/workflows/${wf.id}`)}
              >
                <WorkflowCard workflow={wf} onRun={handleRun} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create new workflow"
        size="sm"
      >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newTitle) createMutation.mutate({ name: newTitle, description: newDesc });
            }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">
              Name
            </label>
            <input
              type="text"
              placeholder="e.g. Invoice Processing"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-400">
              Description (optional)
            </label>
            <textarea
              placeholder="What does this workflow do?"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
