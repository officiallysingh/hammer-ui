import { apiClient } from './client';

export interface AuthorityVM {
  id: string;
  name: string;
  label: string;
  description?: string;
}

export interface AuthorityGroupVM {
  id: string;
  name: string;
  label: string;
  description?: string;
  authorities?: AuthorityVM[];
}

// POST /api/v1/authority-groups
export interface AuthorityGroupCreationReq {
  name: string;
  label: string;
  description: string;
  authorities?: string[]; // authority IDs (strings)
}

// PATCH /api/v1/authority-groups/{id}
export interface AuthorityGroupUpdateReq {
  name?: string;
  label?: string;
  description?: string;
  authorities?: string[]; // replaces all authorities
}

export interface AuthorityCreationReq {
  name: string;
  label: string;
  description: string;
}

export interface AuthorityUpdateReq {
  name?: string;
  label?: string;
  description?: string;
}

export const adminApi = {
  // ── Authority Groups (Roles) ─────────────────────────────────────────────
  getAuthorityGroups: async (expand = false, phrases?: string): Promise<AuthorityGroupVM[]> => {
    const response = await apiClient.get('/api/v1/authority-groups', {
      headers: { 'x-expand': String(expand) },
      params: phrases ? { phrases } : undefined,
    });
    return response.data;
  },

  createAuthorityGroup: async (data: AuthorityGroupCreationReq): Promise<void> => {
    await apiClient.post('/api/v1/authority-groups', data);
  },

  updateAuthorityGroup: async (id: string, data: AuthorityGroupUpdateReq): Promise<void> => {
    await apiClient.patch(`/api/v1/authority-groups/${id}`, data);
  },

  deleteAuthorityGroup: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/authority-groups/${id}`);
  },

  // ── Authorities (Permissions) ─────────────────────────────────────────────
  getAuthorities: async (phrases?: string): Promise<AuthorityVM[]> => {
    const response = await apiClient.get('/api/v1/authorities', {
      params: phrases ? { phrases } : undefined,
    });
    return response.data;
  },

  getAuthoritiesByGroup: async (groupId: string): Promise<AuthorityVM[]> => {
    const response = await apiClient.get(`/api/v1/authority-groups/${groupId}/authorities`);
    return response.data;
  },

  createAuthority: async (data: AuthorityCreationReq): Promise<void> => {
    await apiClient.post('/api/v1/authorities', data);
  },

  updateAuthority: async (id: string, data: AuthorityUpdateReq): Promise<void> => {
    await apiClient.patch(`/api/v1/authorities/${id}`, data);
  },

  deleteAuthority: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/authorities/${id}`);
  },
};
