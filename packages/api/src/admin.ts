import { apiClient } from './client';

export interface AuthorityVM {
  id: number;
  name: string;
  label: string;
  description?: string;
}

export interface AuthorityGroupVM {
  id: number;
  name: string;
  label: string;
  description?: string;
  authorities?: AuthorityVM[];
}

export interface AuthorityGroupCreationReq {
  name: string;
  label: string;
  description?: string;
}

export interface AuthorityCreationReq {
  name: string;
  label: string;
  description?: string;
}

export const adminApi = {
  // ── Authority Groups (Roles) ─────────────────────────────────────────────
  getAuthorityGroups: async (expand = false): Promise<AuthorityGroupVM[]> => {
    const response = await apiClient.get('/api/v1/authority-groups', {
      headers: { 'x-expand': String(expand) },
    });
    return response.data;
  },

  createAuthorityGroup: async (data: AuthorityGroupCreationReq): Promise<void> => {
    const response = await apiClient.post('/api/v1/authority-groups', data);
    return response.data;
  },

  deleteAuthorityGroup: async (id: number): Promise<void> => {
    const response = await apiClient.delete(`/api/v1/authority-groups/${id}`);
    return response.data;
  },

  // ── Authorities (Permissions) ─────────────────────────────────────────────
  getAuthorities: async (): Promise<AuthorityVM[]> => {
    const response = await apiClient.get('/api/v1/authorities');
    return response.data;
  },

  createAuthority: async (data: AuthorityCreationReq): Promise<void> => {
    const response = await apiClient.post('/api/v1/authorities', data);
    return response.data;
  },

  deleteAuthority: async (id: number): Promise<void> => {
    const response = await apiClient.delete(`/api/v1/authorities/${id}`);
    return response.data;
  },
};
