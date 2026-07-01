export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export type Role = "ADMIN" | "MEMBER";

export interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: Role;
  created_at: string;
}

export interface Workflow {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  trigger_type: string;
  is_active: boolean;
  workflow_definition: WorkflowDefinition | null;
  status?: "active" | "draft" | "error";
  created_at: string;
  updated_at: string;
  last_run?: string;
  run_count?: number;
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface WorkflowDefinition {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Document {
  id: string;
  title: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: "processing" | "done" | "failed";
  organization_id: string;
  uploaded_by: string;
  created_at: string;
}

export interface NodeExecution {
  id: string;
  node_id: string | null;
  status: string;
  input_data: Record<string, unknown> | null;
  output_data: Record<string, unknown> | null;
  logs: Record<string, unknown>[] | null;
  error_message: string | null;
  retry_count: number;
  started_at: string | null;
  finished_at: string | null;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  status: "pending" | "running" | "completed" | "failed";
  started_at: string;
  completed_at?: string;
  logs: WorkflowLog[];
  output?: Record<string, unknown>;
  node_executions?: NodeExecution[];
}

export interface WorkflowLog {
  id: string;
  run_id: string;
  level: "info" | "warn" | "error";
  message: string;
  node_id?: string;
  created_at: string;
}

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  type: "extraction" | "summary" | "classification";
  document_id?: string;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface ApiError {
  detail: string;
}

export type BuilderNodeType = "trigger" | "ai_action" | "condition" | "output";

export type WorkflowNode = GraphNode;
export type WorkflowEdge = GraphEdge;

export type IntegrationType = "slack" | "email" | "api_call" | "webhook";

export interface Integration {
  id: string;
  organization_id: string;
  integration_type: IntegrationType;
  name: string;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntegrationField {
  key: string;
  label: string;
  type: "text" | "number" | "password" | "select";
  required: boolean;
  sensitive?: boolean;
  default?: unknown;
  options?: string[];
}

export interface IntegrationFieldSchema {
  fields: IntegrationField[];
}

export interface Job {
  id: string;
  organization_id: string;
  job_type: string;
  status: "pending" | "running" | "success" | "failed";
  progress: number;
  error_message?: string;
  created_at: string;
  started_at?: string;
  finished_at?: string;
}
