import axios from "axios";
import type {
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  User,
  Organization,
  Workflow,
  Document,
  WorkflowRun,
  AIInsight,
  Integration,
  IntegrationFieldSchema,
} from "@/types";
import { getAccessToken, getRefreshToken, setTokens, clearTokens, isTokenExpired } from "./auth";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (err.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/auth/login";
        }
        return Promise.reject(err);
      }

      try {
        const { data } = await axios.post<AuthTokens>(
          `${api.defaults.baseURL}/auth/refresh`,
          { refresh_token: refreshToken }
        );
        setTokens(data.access_token, data.refresh_token);
        processQueue(null, data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/auth/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export const authApi = {
  register: (data: RegisterRequest) =>
    api.post<AuthTokens>("/auth/register", data),
  login: (data: LoginRequest) =>
    api.post<AuthTokens>("/auth/login", data),
};

export const usersApi = {
  getMe: () => api.get<User>("/users/me"),
};

export const organizationsApi = {
  create: (data: { name: string; slug: string }) =>
    api.post<Organization>("/organizations", data),
  getCurrent: () => api.get<Organization>("/organizations/current"),
};

export const workflowsApi = {
  list: () =>
    api.get<{ workflows: Workflow[]; total: number }>("/workflows"),
  get: (id: string) => api.get<Workflow>(`/workflows/${id}`),
  create: (data: { name: string; description?: string; trigger_type?: string; workflow_definition?: any }) =>
    api.post<Workflow>("/workflows", data),
  update: (id: string, data: { name?: string; description?: string; trigger_type?: string; is_active?: boolean; workflow_definition?: any }) =>
    api.put<Workflow>(`/workflows/${id}`, data),
  delete: (id: string) => api.delete(`/workflows/${id}`),
  getRuns: (id: string) =>
    api.get<WorkflowRun[]>(`/workflows/${id}/runs`),
  getRun: (runId: string) =>
    api.get<any>(`/workflows/runs/${runId}`),
  trigger: (id: string, trigger_data?: Record<string, unknown>) =>
    api.post<{ runs_created: number; message: string; run_ids: string[] }>(
      `/workflows/${id}/trigger`,
      { trigger_data: trigger_data ?? {} }
    ),
};

function mapDoc(r: { id: string; filename: string; size: number; content_type: string; uploaded_at: string }): Document {
  const title = r.filename.replace(/\.[^/.]+$/, "");
  return { id: r.id, title, filename: r.filename, file_type: r.content_type, file_size: r.size, status: "done", organization_id: "", uploaded_by: "", created_at: r.uploaded_at };
}

export const documentsApi = {
  list: (orgId: string) =>
    api.get(`/documents?organization_id=${orgId}`).then((r) => r.data.map(mapDoc)),
  upload: (file: File, orgId?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (orgId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId)) {
      form.append("organization_id", orgId);
    }
    return api.post("/documents/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => mapDoc(r.data));
  },
  get: (id: string) =>
    api.get(`/documents/${id}`).then((r) => mapDoc(r.data)),
  delete: (id: string) => api.delete(`/documents/${id}`),
};

export const integrationsApi = {
  list: (type?: string) => {
    const params = type ? { integration_type: type } : {};
    return api.get<{ integrations: Integration[]; total: number }>("/integrations", { params });
  },
  get: (id: string) => api.get<Integration>(`/integrations/${id}`),
  create: (data: { integration_type: string; name: string; config: Record<string, unknown> }) =>
    api.post<Integration>("/integrations", data),
  update: (id: string, data: { name?: string; config?: Record<string, unknown>; is_active?: boolean }) =>
    api.put<Integration>(`/integrations/${id}`, data),
  delete: (id: string) => api.delete(`/integrations/${id}`),
  test: (id: string) => api.post<{ success: boolean; message: string }>(`/integrations/${id}/test`),
  getTypes: () => api.get<string[]>("/integrations/types"),
  getFields: (type: string) => api.get<IntegrationFieldSchema>(`/integrations/types/${type}/fields`),
  generateWebhookUrl: (workflowId: string) =>
    api.post<{ webhook_url: string; webhook_secret: string; webhook_id: string }>(
      `/integrations/${workflowId}/webhook-url`
    ),
};

export const insightsApi = {
  list: (orgId: string) =>
    api.get<AIInsight[]>(`/insights?organization_id=${orgId}`),
};

export const jobsApi = {
  list: () => api.get<import("@/types").Job[]>("/jobs"),
  get: (id: string) => api.get<import("@/types").Job>(`/jobs/${id}`),
};

export default api;
