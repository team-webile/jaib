import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const auth = {
  register: (data: { name: string; email: string; password: string; password_confirmation: string }) =>
    api.post("/register", data),
  login: (data: { email: string; password: string }) => api.post("/login", data),
  logout: () => api.post("/logout"),
  me: () => api.get("/user"),
};

export const organizations = {
  list: () => api.get("/organizations"),
  create: (data: { name: string; description?: string }) => api.post("/organizations", data),
  show: (id: number) => api.get(`/organizations/${id}`),
  update: (id: number, data: { name?: string; description?: string }) => api.put(`/organizations/${id}`, data),
  delete: (id: number) => api.delete(`/organizations/${id}`),
  invite: (id: number, data: { email: string; role: string }) => api.post(`/organizations/${id}/invite`, data),
  updateMemberRole: (orgId: number, userId: number, data: { role: string }) =>
    api.put(`/organizations/${orgId}/users/${userId}`, data),
  removeMember: (orgId: number, userId: number) => api.delete(`/organizations/${orgId}/users/${userId}`),
};

export const accounts = {
  list: (orgId: number, params?: Record<string, string>) =>
    api.get(`/organizations/${orgId}/accounts`, { params }),
  create: (orgId: number, data: Record<string, unknown>) =>
    api.post(`/organizations/${orgId}/accounts`, data),
  show: (orgId: number, accountId: number) =>
    api.get(`/organizations/${orgId}/accounts/${accountId}`),
  update: (orgId: number, accountId: number, data: Record<string, unknown>) =>
    api.put(`/organizations/${orgId}/accounts/${accountId}`, data),
  delete: (orgId: number, accountId: number) =>
    api.delete(`/organizations/${orgId}/accounts/${accountId}`),
  balance: (orgId: number, accountId: number) =>
    api.get(`/organizations/${orgId}/accounts/${accountId}/balance`),
};

export const journalEntries = {
  list: (orgId: number, params?: Record<string, string | number>) =>
    api.get(`/organizations/${orgId}/journal-entries`, { params }),
  create: (orgId: number, data: Record<string, unknown>) =>
    api.post(`/organizations/${orgId}/journal-entries`, data),
  show: (orgId: number, id: number) => api.get(`/organizations/${orgId}/journal-entries/${id}`),
  update: (orgId: number, id: number, data: Record<string, unknown>) =>
    api.put(`/organizations/${orgId}/journal-entries/${id}`, data),
  delete: (orgId: number, id: number) => api.delete(`/organizations/${orgId}/journal-entries/${id}`),
  post: (orgId: number, id: number) => api.post(`/organizations/${orgId}/journal-entries/${id}/post`),
  unpost: (orgId: number, id: number) => api.post(`/organizations/${orgId}/journal-entries/${id}/unpost`),
};

export const dashboard = {
  summary: (orgId: number) => api.get(`/organizations/${orgId}/dashboard`),
  balanceSheet: (orgId: number, params?: { as_of_date?: string }) =>
    api.get(`/organizations/${orgId}/balance-sheet`, { params }),
  incomeStatement: (orgId: number, params?: { from_date?: string; to_date?: string }) =>
    api.get(`/organizations/${orgId}/income-statement`, { params }),
};

export default api;
