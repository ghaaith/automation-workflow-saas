"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Settings2, X, Upload, Sparkles, GitBranch, Send, Database, RefreshCw } from "lucide-react";
import type { GraphNode, BuilderNodeType, Document } from "@/types";
import { documentsApi, integrationsApi } from "@/lib/api";
import { useStore } from "@/lib/store";

interface ConfigPanelProps {
  node: GraphNode | null;
  onUpdate: (id: string, updates: Partial<GraphNode>) => void;
  onClose: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  trigger: <Upload className="h-4 w-4" />,
  ai_action: <Sparkles className="h-4 w-4" />,
  condition: <GitBranch className="h-4 w-4" />,
  output: <Send className="h-4 w-4" />,
};

const colorMap: Record<string, string> = {
  trigger: "text-emerald-400",
  ai_action: "text-indigo-400",
  condition: "text-amber-400",
  output: "text-sky-400",
};

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "select" | "number" | "textarea";
  options?: { label: string; value: string }[];
};

function outputFields(handler: string): FieldDef[] {
  if (handler === "send_slack") {
    return [
      { key: "channel", label: "Channel", type: "text" },
    ];
  }
  if (handler === "send_email") {
    return [
      { key: "integration_id", label: "Saved Integration", type: "text" },
      { key: "to", label: "To", type: "text" },
      { key: "cc", label: "CC", type: "text" },
      { key: "subject", label: "Subject Template", type: "text" },
      { key: "body", label: "Body Template", type: "textarea" },
    ];
  }
  if (handler === "api_call") {
    return [
      { key: "integration_id", label: "Saved Integration", type: "text" },
      { key: "url", label: "URL", type: "text" },
      { key: "method", label: "Method", type: "select", options: [
        { label: "GET", value: "GET" },
        { label: "POST", value: "POST" },
        { label: "PUT", value: "PUT" },
        { label: "PATCH", value: "PATCH" },
        { label: "DELETE", value: "DELETE" },
      ]},
      { key: "headers", label: "Headers (JSON)", type: "textarea" },
      { key: "body", label: "Body Template", type: "textarea" },
      { key: "auth_type", label: "Auth Type", type: "select", options: [
        { label: "None", value: "none" },
        { label: "Bearer Token", value: "bearer" },
        { label: "Basic Auth", value: "basic" },
      ]},
    ];
  }
  return [];
}

const configFields: Record<BuilderNodeType, () => FieldDef[]> = {
  trigger: () => [
    { key: "handler", label: "Trigger Type", type: "select", options: [
      { label: "Document Uploaded", value: "trigger_document_uploaded" },
      { label: "Webhook", value: "trigger_webhook" },
    ]},
    { key: "document_id", label: "Document ID", type: "text" },
    { key: "filename", label: "Filename", type: "text" },
  ],
  ai_action: () => [
    { key: "handler", label: "AI Action", type: "select", options: [
      { label: "Extract Data", value: "ai_extract" },
      { label: "Summarize", value: "ai_summarize" },
    ]},
    { key: "model", label: "Model", type: "select", options: [
      { label: "Llama 3.3 70B", value: "llama-3.3-70b-versatile" },
      { label: "Mixtral 8x7B", value: "mixtral-8x7b-32768" },
      { label: "Llama 3.1 8B", value: "llama-3.1-8b-instant" },
      { label: "Gemma 2 9B", value: "gemma2-9b-it" },
    ]},
    { key: "prompt", label: "Prompt", type: "textarea" },
  ],
  condition: () => [
    { key: "expression", label: "Expression", type: "text" },
    { key: "source_field", label: "Source Field", type: "text" },
  ],
  output: () => {
    return [
      { key: "handler", label: "Output Type", type: "select", options: [
        { label: "Send Slack", value: "send_slack" },
        { label: "Send Email", value: "send_email" },
        { label: "API Call", value: "api_call" },
      ]},
    ];
  },
};

export function ConfigPanel({ node, onUpdate, onClose }: ConfigPanelProps) {
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>({});
  const orgId = useStore((s) => s.organization?.id);

  const { data: docsData, isLoading: docsLoading, refetch: refetchDocs } = useQuery({
    queryKey: ["workflow-documents", orgId ?? "none"],
    queryFn: async () => {
      if (!orgId) return [];
      const docs = await documentsApi.list(orgId);
      return docs ?? [];
    },
    enabled: !!orgId && node?.type === "trigger",
  });

  const currentHandler = (localConfig.handler as string) || "";

  const { data: slackIntegrations, isLoading: slackIntegrationsLoading, refetch: refetchIntegrations } = useQuery({
    queryKey: ["slack-integrations"],
    queryFn: async () => {
      try {
        const r = await integrationsApi.list("slack");
        return r.data.integrations ?? [];
      } catch {
        return [];
      }
    },
    enabled: node?.type === "output" && currentHandler === "send_slack",
    staleTime: 10000,
  });

  useEffect(() => {
    if (node) {
      setLocalConfig({ ...node.config });
    }
  }, [node?.id]);

  const handleChange = useCallback(
    (key: string, value: unknown) => {
      const next = { ...localConfig, [key]: value };
      setLocalConfig(next);
      if (node) {
        onUpdate(node.id, { config: next });
      }
    },
    [localConfig, node, onUpdate]
  );

  const handleLabelChange = useCallback(
    (value: string) => {
      if (node) {
        onUpdate(node.id, { label: value });
      }
    },
    [node, onUpdate]
  );

  if (!node) {
    return (
      <aside className="w-72 border-l border-zinc-800/50 bg-zinc-950/50 flex items-center justify-center">
        <div className="text-center px-6">
          <Settings2 className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-xs text-zinc-600">Select a node to configure its properties</p>
        </div>
      </aside>
    );
  }

  const getBaseFields = configFields[node.type as BuilderNodeType];
  const baseFields = getBaseFields ? getBaseFields() : [];
  const isOutput = node.type === "output";
  const fields = (isOutput
    ? [...baseFields.slice(0, 1), ...outputFields(currentHandler).slice(1)]
    : baseFields
  ).filter((f) => !(node.type === "trigger" && currentHandler === "trigger_document_uploaded" && f.key === "document_id"));

  return (
    <aside className="w-72 border-l border-zinc-800/50 bg-zinc-950/50 flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between p-3 border-b border-zinc-800/30">
        <div className="flex items-center gap-2">
          <span className={colorMap[node.type] || "text-zinc-400"}>
            {iconMap[node.type]}
          </span>
          <span className="text-xs font-semibold text-zinc-300">Configuration</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-3.5 space-y-4">
        <div className="space-y-1.5">
          <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Label
          </label>
          <input
            type="text"
            value={node.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50 transition-colors"
          />
        </div>

        {fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              {field.label}
            </label>
            {field.type === "select" ? (
              <select
                value={(localConfig[field.key] as string) || ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50 transition-colors"
              >
                <option value="" className="bg-zinc-900">Select...</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-zinc-900">
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                value={(localConfig[field.key] as string) || ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50 transition-colors resize-none"
              />
            ) : (
              <input
                type={field.type}
                value={(localConfig[field.key] as string) || ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50 transition-colors"
              />
            )}
          </div>
        ))}

        {node.type === "trigger" && currentHandler === "trigger_document_uploaded" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                Document
              </label>
              <button
                onClick={() => refetchDocs()}
                className="p-1 rounded text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                title="Refresh document list"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
            {docsLoading ? (
              <div className="text-xs text-zinc-600 py-2">Loading documents...</div>
            ) : !docsData?.length ? (
              <div className="text-xs text-zinc-600 py-2">No documents found. Upload one first.</div>
            ) : (
              <select
                value={(localConfig.document_id as string) || ""}
                onChange={(e) => handleChange("document_id", e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50 transition-colors"
              >
                <option value="" className="bg-zinc-900">Any document (on upload)</option>
                {docsData.map((doc: Document) => (
                  <option key={doc.id} value={doc.id} className="bg-zinc-900">
                    {doc.title} — {doc.filename}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {node.type === "ai_action" && currentHandler === "ai_extract" && (
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Output Schema (JSON)
            </label>
            <textarea
              value={(localConfig.schema as string) || ""}
              onChange={(e) => handleChange("schema", e.target.value)}
              rows={6}
              placeholder={`{\n  "fields": {\n    "field_name": "description"\n  }\n}`}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50 transition-colors resize-none font-mono"
            />
            <p className="text-[10px] text-zinc-600">
              Define the JSON schema describing the data structure to extract. The AI will follow this schema exactly.
            </p>
          </div>
        )}

        {node.type === "output" && currentHandler === "send_slack" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                Integration
              </label>
              <button
                onClick={() => refetchIntegrations()}
                className="p-1 rounded text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                title="Refresh integrations"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
            {slackIntegrationsLoading ? (
              <div className="text-xs text-zinc-600 py-2">Loading integrations...</div>
            ) : !slackIntegrations?.length ? (
              <div className="text-xs text-zinc-600 py-2">
                No Slack integrations found. Add one in Settings first.
              </div>
            ) : (
              <select
                value={(localConfig.integration_id as string) || ""}
                onChange={(e) => {
                  const selected = slackIntegrations.find(
                    (i) => i.id === e.target.value
                  );
                  const channel = selected?.config?.channel
                    ? (selected.config.channel as string)
                    : "#general";
                  setLocalConfig({ ...localConfig, integration_id: e.target.value, channel });
                  if (node) {
                    onUpdate(node.id, {
                      config: { ...node.config, integration_id: e.target.value, channel },
                    });
                  }
                }}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700/50 transition-colors"
              >
                <option value="" className="bg-zinc-900">Select an integration...</option>
                {slackIntegrations.map((integration) => (
                  <option key={integration.id} value={integration.id} className="bg-zinc-900">
                    {integration.name} — {String(integration.config?.channel ?? "#general")}
                  </option>
                ))}
              </select>
            )}
            <p className="text-[10px] text-zinc-600">
              An intelligent summary of the uploaded document will be sent automatically.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
