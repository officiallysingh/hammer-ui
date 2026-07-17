import { apiClient } from './client';

export interface PermissionVM {
  id: string;
  name: string;
  label: string;
  description?: string;
}

export interface RoleVM {
  id: string;
  name: string;
  label: string;
  description?: string;
  permissions?: PermissionVM[];
}

// POST /api/v1/roles
export interface RoleCreationReq {
  name: string;
  label: string;
  description: string;
  permissions?: string[]; // permission IDs (strings)
}

// PATCH /api/v1/roles/{id}
export interface RoleUpdateReq {
  name?: string;
  label?: string;
  description?: string;
  permissions?: string[]; // replaces all permissions
}

export interface PermissionCreationReq {
  name: string;
  label: string;
  description: string;
}

export interface PermissionUpdateReq {
  name?: string;
  label?: string;
  description?: string;
}

export const adminApi = {
  // ── Roles ─────────────────────────────────────────────────────────────────
  getRoles: async (expand = false, phrases?: string[]): Promise<RoleVM[]> => {
    const response = await apiClient.get('/api/v1/roles', {
      headers: { 'x-expand': String(expand) },
      params: phrases?.length ? { phrases } : undefined,
    });
    return response.data;
  },

  createRole: async (data: RoleCreationReq): Promise<void> => {
    await apiClient.post('/api/v1/roles', data);
  },

  updateRole: async (id: string, data: RoleUpdateReq): Promise<void> => {
    await apiClient.patch(`/api/v1/roles/${id}`, data);
  },

  deleteRole: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/roles/${id}`);
  },

  // ── Permissions ───────────────────────────────────────────────────────────
  getPermissions: async (phrases?: string[]): Promise<PermissionVM[]> => {
    const response = await apiClient.get('/api/v1/permissions', {
      params: phrases?.length ? { phrases } : undefined,
    });
    return response.data;
  },

  getPermissionsByRole: async (roleId: string): Promise<PermissionVM[]> => {
    const response = await apiClient.get(`/api/v1/roles/${roleId}/permissions`);
    return response.data;
  },

  createPermission: async (data: PermissionCreationReq): Promise<void> => {
    await apiClient.post('/api/v1/permissions', data);
  },

  updatePermission: async (id: string, data: PermissionUpdateReq): Promise<void> => {
    await apiClient.patch(`/api/v1/permissions/${id}`, data);
  },

  deletePermission: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/permissions/${id}`);
  },
};
