import api from './axios';

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export const dashboardAPI = {
  summary: () => api.get('/dashboard/summary'),
};

export const applicationsAPI = {
  create: (data) => api.post('/applications', data),
  list: (params) => api.get('/applications', { params }),
  get: (id) => api.get(`/applications/${id}`),
  getChecklist: (id) => api.get(`/applications/${id}/checklist`),
  updateStatus: (id, data) => api.patch(`/applications/${id}/status`, data),
  getFindings: (id, params) => api.get(`/applications/${id}/findings`, { params }),
  getAudit: (id, params) => api.get(`/applications/${id}/audit`, { params }),
  validate: (id, data) => api.post(`/applications/${id}/validate`, data),
  requestRectification: (id, data) => api.post(`/applications/${id}/rectifications`, data),
  listDocuments: (id) => api.get(`/applications/${id}/documents`),
  uploadDocument: (id, formData) =>
    api.post(`/applications/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const documentsAPI = {
  get: (id) => api.get(`/documents/${id}`),
  download: (id) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  correctField: (docId, fieldId, data) => api.patch(`/documents/${docId}/fields/${fieldId}`, data),
  verify: (id, data) => api.post(`/documents/${id}/verify`, data),
  getVerifications: (id) => api.get(`/documents/${id}/verifications`),
};

export const regulatoryAPI = {
  listSources: () => api.get('/regulations/sources'),
  uploadSource: (formData) =>
    api.post('/regulations/sources', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  search: (q, limit) => api.get('/regulations/search', { params: { q, limit } }),
  ask: (data) => api.post('/regulations/ask', data),
};

export const adminAPI = {
  listUsers: () => api.get('/admin/users'),
  updateUserRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  listCategories: () => api.get('/admin/categories'),
  createCategory: (data) => api.post('/admin/categories', data),
  listRules: () => api.get('/admin/rules'),
  createRule: (data) => api.post('/admin/rules', data),
  updateRule: (id, data) => api.patch(`/admin/rules/${id}`, data),
  listChecklists: () => api.get('/admin/checklists'),
  createChecklist: (data) => api.post('/admin/checklists', data),
};
