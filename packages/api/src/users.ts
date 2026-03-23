import { apiClient } from './client';

// Admin user detail (GET /api/v1/users, /{id})
export interface UserDetailVM {
  id: string;
  username?: string;
  emailId: string;
  firstName?: string;
  lastName?: string;
  mobileNo?: string;
  authorities?: AuthorityVMRef[];
  authorityGroups?: AuthorityGroupVMRef[];
  enabled: boolean;
  accountNonLocked: boolean;
  accountNonExpired: boolean;
  credentialsNonExpired: boolean;
  emailIdVerified: boolean;
  mobileNoVerified: boolean;
  passwordSet: boolean;
  promptChangePassword: boolean;
}

export interface AuthorityVMRef {
  id: string;
  name: string;
  label: string;
  description?: string;
}

export interface AuthorityGroupVMRef {
  id: string;
  name: string;
  label: string;
  description?: string;
}

// Admin create user (POST /api/v1/users)
export interface UserCreationReq {
  username: string;
  emailId: string;
  firstName: string;
  lastName: string;
  mobileNo?: string;
  authorities?: string[];
  authorityGroups?: string[];
  enabled?: boolean;
}

// Admin update user (PATCH /api/v1/users/{id})
export interface UserUpdateReq {
  emailId: string;
  firstName?: string;
  lastName?: string;
  mobileNo?: string;
  enabled?: boolean;
  accountNonLocked?: boolean;
  accountNonExpired?: boolean;
  credentialsNonExpired?: boolean;
  newAuthorityGroups?: string[];
  authorityGroupsToReplace?: string[];
  authorityGroupsToRemove?: string[];
}

// Self user info (GET /api/v1/users/username/{loginName}/info)
export interface UserInfo {
  username: string;
  emailId: string;
  firstName?: string;
  lastName?: string;
  mobileNo?: string;
  authorities: string[];
  authorityGroups?: string[];
  enabled: boolean;
  accountNonLocked: boolean;
  accountNonExpired: boolean;
  credentialsNonExpired: boolean;
  emailIdVerified: boolean;
  mobileNoVerified: boolean;
  promptChangePassword: boolean;
}

export interface PaginatedUsers {
  content?: UserDetailVM[];
  page?: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export const usersApi = {
  getUserInfoByLoginName: async (loginName: string): Promise<UserInfo> => {
    const response = await apiClient.get<UserInfo>(
      `/api/v1/users/username/${encodeURIComponent(loginName)}/info`,
    );
    return response.data;
  },
  checkUsernameExists: async (username: string) => {
    const response = await apiClient.get(`/api/v1/users/username/${username}/exists`);
    return response.data;
  },
  checkEmailExists: async (email: string) => {
    const response = await apiClient.get(`/api/v1/users/email/${email}/exists`);
    return response.data;
  },
  checkMobileExists: async (mobile: string) => {
    const response = await apiClient.get(`/api/v1/users/mobile/${mobile}/exists`);
    return response.data;
  },
  getUsers: async (page = 0, size = 20): Promise<UserDetailVM[]> => {
    const response = await apiClient.get<PaginatedUsers>('/api/v1/users', {
      params: { page, size },
    });
    const data = response.data;
    // Handle both paginated and plain array responses
    if (Array.isArray(data)) return data as unknown as UserDetailVM[];
    return data?.content ?? [];
  },
  createUser: async (data: UserCreationReq): Promise<void> => {
    await apiClient.post('/api/v1/users', data);
  },
  getUserById: async (id: string): Promise<UserDetailVM> => {
    const response = await apiClient.get(`/api/v1/users/${id}`);
    return response.data;
  },
  updateUser: async (id: string, data: UserUpdateReq): Promise<void> => {
    await apiClient.patch(`/api/v1/users/${id}`, data);
  },
  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/users/${id}`);
  },
};
