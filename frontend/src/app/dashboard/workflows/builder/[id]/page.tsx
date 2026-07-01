"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  ReactFlowProvider,
  ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NodeSidebar } from "@/components/workflow/NodeSidebar";
import { nodeTypes, BuilderNode } from "@/components/workflow/BuilderNode";
import { ConfigPanel } from "@/components/workflow/ConfigPanel";
import { workflowsApi } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  GraphNode,
  GraphEdge,
  WorkflowDefinition,
  BuilderNodeType,
} from "@/types";
import toast from "react-hot-toast";

type RFNode = Node;
type RFEdge = Edge;

const defaultViewport = { x: 0, y: 0, zoom: 1 };
const NODE_SPACING_X = 300;
const NODE_SPACING_Y = 120;

function toReactFlowNodes(gnodes: GraphNode[]): RFNode[] {
  return gnodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: {
      label: n.label,
      nodeType: n.type,
      config: n.config,
      onDelete: () => {},
    },
  }));
}

function toReactFlowEdges(gedges: GraphEdge[]): RFEdge[] {
  return gedges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: true,
    style: { stroke: "#52525b", strokeWidth: 2 },
    labelStyle: { fill: "#a1a1aa", fontSize: 11, fontWeight: 500 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 16,
      height: 16,
      color: "#52525b",
    },
  }));
}

function fromReactFlowNodes(nodes: RFNode[]): GraphNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: (n.data?.nodeType as string) || n.type || "trigger",
    label: (n.data?.label as string) || "",
    position: n.position,
    config: (n.data?.config as Record<string, unknown>) || {},
  }));
}

function fromReactFlowEdges(edges: RFEdge[]): GraphEdge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: typeof e.label === "string" ? e.label : undefined,
  }));
}

export default function WorkflowBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const workflowId = params.id as string;

  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([] as RFNode[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as RFEdge[]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);

  const { data: workflow, isLoading } = useQuery({
    queryKey: ["workflow", workflowId],
    queryFn: () => workflowsApi.get(workflowId).then((r) => r.data),
  });

  useEffect(() => {
    if (workflow?.workflow_definition) {
      const def = workflow.workflow_definition;
      const rfNodes = toReactFlowNodes(def.nodes || []);
      const rfEdges = toReactFlowEdges(def.edges || []);
      setNodes(rfNodes);
      setEdges(rfEdges);
      idCounter.current = rfNodes.length;
    }
  }, [workflow?.id]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const isConditionSource = nodes.some(
        (n) => n.id === connection.source && n.type === "condition"
      );

      const edge: RFEdge = {
        id: `edge_${Date.now()}_${idCounter.current++}`,
        source: connection.source!,
        target: connection.target!,
        animated: true,
        style: { stroke: "#52525b", strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: "#52525b",
        },
        labelStyle: { fill: "#a1a1aa", fontSize: 11, fontWeight: 500 },
      };
      setEdges((eds) => addEdge(edge, eds));
      console.log("Edge created", { source: connection.source, target: connection.target });
    },
    [setEdges, nodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(
        "application/reactflow-type"
      ) as BuilderNodeType;
      if (!type || !reactFlowWrapper.current || !rfInstance) return;

      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const snappedX = Math.round(position.x / NODE_SPACING_X) * NODE_SPACING_X;
      const snappedY = Math.round(position.y / NODE_SPACING_Y) * NODE_SPACING_Y;

      const id = `node_${Date.now()}_${idCounter.current++}`;
      const label =
        type === "trigger"
          ? "Trigger"
          : type === "ai_action"
          ? "AI Action"
          : type === "condition"
          ? "Condition"
          : "Output";

      const defaultConfig: Record<string, unknown> = {};
      if (type === "trigger") {
        defaultConfig.handler = "trigger_webhook";
      } else if (type === "ai_action") {
        defaultConfig.handler = "ai_extract";
      } else if (type === "condition") {
        defaultConfig.handler = "condition";
      } else if (type === "output") {
        defaultConfig.handler = "send_email";
      }

      const newNode: RFNode = {
        id,
        type,
        position: { x: snappedX, y: snappedY },
        data: {
          label,
          nodeType: type,
          config: defaultConfig,
          onDelete: (nodeId: string) => {
            setNodes((nds) => nds.filter((n) => n.id !== nodeId));
            setEdges((eds) =>
              eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
            );
            setSelectedNodeId((prev) => (prev === nodeId ? null : prev));
          },
        },
      };

      setNodes((nds) => [...nds, newNode]);
      console.log("Node created", { id, type, label, config: defaultConfig });
      toast.success(`${label} node added`);
    },
    [rfInstance, setNodes, setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: RFNode) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const deleteSelectedNode = useCallback(() => {
    if (selectedNodeId) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
      setEdges((eds) =>
        eds.filter(
          (e) => e.source !== selectedNodeId && e.target !== selectedNodeId
        )
      );
      setSelectedNodeId(null);
      toast.success("Node deleted");
    }
  }, [selectedNodeId, setNodes, setEdges]);

  const handleSave = useCallback(async () => {
    if (!workflow) return;
    setSaving(true);
    try {
      const gnodes = fromReactFlowNodes(nodes);
      const gedges = fromReactFlowEdges(edges);
      const definition: WorkflowDefinition = { nodes: gnodes, edges: gedges };

      await workflowsApi.update(workflowId, {
        workflow_definition: definition,
      });

      queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] });
      console.log("Workflow saved successfully", { workflowId, nodes: gnodes.length, edges: gedges.length });
      toast.success("Workflow saved");
    } catch {
      toast.error("Failed to save workflow");
    } finally {
      setSaving(false);
    }
  }, [workflow, workflowId, nodes, edges, queryClient]);

  const triggerMutation = useMutation({
    mutationFn: () => workflowsApi.trigger(workflowId),
    onSuccess: () => {
      toast.success("Workflow triggered! Execution started in background.");
      queryClient.invalidateQueries({ queryKey: ["workflow-runs", workflowId] });
    },
    onError: () => {
      toast.error("Failed to trigger workflow");
    },
  });

  const handleRun = useCallback(() => {
    triggerMutation.mutate();
  }, [triggerMutation]);

  const selectedNode =
    nodes.find((n) => n.id === selectedNodeId) ?? null;
  const selectedGraphNode: GraphNode | null = selectedNode
    ? fromReactFlowNodes([selectedNode])[0]
    : null;

  const onUpdateNodeConfig = useCallback(
    (id: string, updates: Partial<GraphNode>) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n;
          const data = { ...n.data };
          if (updates.label) data.label = updates.label;
          if (updates.config) data.config = updates.config;
          return { ...n, data };
        })
      );
    },
    [setNodes]
  );

  const edgesWithUpdatable = edges.map((e) => ({
    ...e,
    animated: true,
    style: { stroke: "#52525b", strokeWidth: 2 },
    labelStyle: { fill: "#a1a1aa", fontSize: 11, fontWeight: 500 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 16,
      height: 16,
      color: "#52525b",
    },
  }));

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
          <div className="w-5 h-5 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-3.5rem)] flex flex-col -m-6">
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-zinc-800/50 bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-zinc-100">
                {workflow?.name || "Untitled Workflow"}
              </h1>
              <p className="text-[11px] text-zinc-600">Workflow Builder</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              icon={<Save className="h-3.5 w-3.5" />}
              onClick={handleSave}
              loading={saving}
            >
              Save
            </Button>
            <Button
              size="sm"
              icon={<Play className="h-3.5 w-3.5" />}
              onClick={handleRun}
              loading={triggerMutation.isPending}
            >
              Run
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <NodeSidebar />

          <div ref={reactFlowWrapper} className="flex-1 relative">
            <ReactFlowProvider>
              <ReactFlow
                nodes={nodes}
                edges={edgesWithUpdatable}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                onDelete={deleteSelectedNode}
                onInit={setRfInstance}
                nodeTypes={nodeTypes as NodeTypes}
                defaultViewport={defaultViewport}
                deleteKeyCode={["Backspace", "Delete"]}
                fitView
                minZoom={0.1}
                maxZoom={2}
                snapToGrid
                snapGrid={[NODE_SPACING_X / 4, NODE_SPACING_Y / 4]}
                defaultEdgeOptions={{
                  animated: true,
                  style: { stroke: "#52525b", strokeWidth: 2 },
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 16,
                    height: 16,
                    color: "#52525b",
                  },
                }}
              >
                <Background
                  color="rgba(255,255,255,0.02)"
                  gap={32}
                  size={1}
                />
                <Controls
                  className="!bg-zinc-900 !border-zinc-800 !rounded-lg !shadow-lg"
                />
                <MiniMap
                  nodeColor="#27272a"
                  maskColor="rgba(9,9,11,0.6)"
                  className="!bg-zinc-900 !border-zinc-800 !rounded-lg"
                />
              </ReactFlow>
            </ReactFlowProvider>
          </div>

          <ConfigPanel
            node={selectedGraphNode}
            onUpdate={onUpdateNodeConfig}
            onClose={() => setSelectedNodeId(null)}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
