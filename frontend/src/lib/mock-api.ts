import type {
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  Workflow,
  Document,
  WorkflowRun,
  AIInsight,
  Organization,
} from "@/types";
import {
  mockUser,
  mockOrganization,
  mockWorkflows,
  mockDocuments,
  mockWorkflowRuns,
  mockAIInsights,
  mockMembers,
} from "./mock-data";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockAuthApi = {
  register: async (data: RegisterRequest): Promise<AuthTokens> => {
    await delay(800);
    localStorage.setItem("mock_user", JSON.stringify(data));
    return { access_token: "mock_token_" + Date.now(), token_type: "bearer" };
  },
  login: async (data: LoginRequest): Promise<AuthTokens> => {
    await delay(600);
    if (!data.email || !data.password) throw new Error("Invalid credentials");
    return { access_token: "mock_token_" + Date.now(), token_type: "bearer" };
  },
};

export const mockUsersApi = {
  getMe: async () => {
    await delay(300);
    return mockUser;
  },
};

export const mockOrganizationsApi = {
  create: async (data: { name: string; slug: string }): Promise<Organization> => {
    await delay(500);
    return { ...mockOrganization, name: data.name, slug: data.slug };
  },
  getCurrent: async () => {
    await delay(300);
    return mockOrganization;
  },
};

export const mockWorkflowsApi = {
  list: async (): Promise<{ workflows: Workflow[]; total: number }> => {
    await delay(500);
    return { workflows: mockWorkflows, total: mockWorkflows.length };
  },
  get: async (id: string): Promise<Workflow> => {
    await delay(300);
    const wf = mockWorkflows.find((w) => w.id === id);
    if (!wf) throw new Error("Workflow not found");
    return wf;
  },
  create: async (data: Partial<Workflow>): Promise<Workflow> => {
    await delay(600);
    const wf: Workflow = {
      id: "wf_" + Date.now(),
      name: (data as any).name || "New Workflow",
      organization_id: "org_1",
      description: data.description || "",
      status: "draft",
      trigger_type: (data as any).trigger_type || "manual",
      is_active: true,
      workflow_definition: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      run_count: 0,
    };
    return wf;
  },
  update: async (id: string, data: Partial<Workflow>): Promise<Workflow> => {
    await delay(400);
    const wf = mockWorkflows.find((w) => w.id === id);
    if (!wf) throw new Error("Workflow not found");
    return { ...wf, ...data, updated_at: new Date().toISOString() };
  },
  delete: async (id: string): Promise<void> => {
    await delay(300);
  },
  getRuns: async (id: string): Promise<WorkflowRun[]> => {
    await delay(500);
    return id === "wf_1"
      ? mockWorkflowRuns
      : [
          {
            id: "run_" + Date.now(),
            workflow_id: id,
            status: "completed",
            started_at: new Date(Date.now() - 3600000).toISOString(),
            completed_at: new Date().toISOString(),
            logs: [],
          },
        ];
  },
};

export const mockDocumentsApi = {
  list: async (): Promise<Document[]> => {
    await delay(500);
    return mockDocuments;
  },
  upload: async (file: File): Promise<Document> => {
    await delay(2000);
    const doc: Document = {
      id: "doc_" + Date.now(),
      title: file.name.replace(/\.[^/.]+$/, ""),
      filename: file.name,
      file_type: file.type,
      file_size: file.size,
      status: "processing",
      organization_id: "org_1",
      uploaded_by: "usr_1",
      created_at: new Date().toISOString(),
    };
    return doc;
  },
  get: async (id: string): Promise<Document> => {
    await delay(300);
    const doc = mockDocuments.find((d) => d.id === id);
    if (!doc) throw new Error("Document not found");
    return doc;
  },
  delete: async (id: string): Promise<void> => {
    await delay(300);
  },
};

export const mockInsightsApi = {
  list: async (): Promise<AIInsight[]> => {
    await delay(400);
    return mockAIInsights;
  },
};

export const mockMembersApi = {
  list: async () => {
    await delay(400);
    return mockMembers;
  },
};
