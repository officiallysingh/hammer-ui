import { apiClient } from './client';

// Admin user detail (GET /api/v1/users, /{id})
export interface UserDetailVM {
  id: string;
  username?: string;
  emailId: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string | null;
  mobileNo?: string;
  permissions?: PermissionVMRef[];
  roles?: RoleVMRef[];
  enabled: boolean;
  accountNonLocked: boolean;
  accountNonExpired: boolean;
  credentialsNonExpired: boolean;
  emailIdVerified: boolean;
  mobileNoVerified: boolean;
  passwordSet?: boolean;
  promptChangePassword: boolean;
}

export interface PermissionVMRef {
  id: string;
  name: string;
  label: string;
  description?: string;
}

export interface RoleVMRef {
  id: string;
  name: string;
  label: string;
  description?: string;
  permissions?: PermissionVMRef[]; // present when x-expand includes role-permissions
}

// Admin create user (POST /api/v1/users)
export interface UserCreationReq {
  username: string;
  emailId: string;
  firstName: string;
  lastName: string;
  profilePicture?: string | null;
  mobileNo?: string;
  permissions?: string[];
  roles?: string[];
  enabled?: boolean;
  emailIdVerified?: boolean;
  mobileNoVerified?: boolean;
  promptChangePassword?: boolean;
  credentialsNonExpired?: boolean;
  accountNonLocked?: boolean;
  accountNonExpired?: boolean;
}

// Admin update user (PATCH /api/v1/users/{id})
export interface UserUpdateReq {
  emailId?: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string | null;
  mobileNo?: string;
  enabled?: boolean;
  credentialsNonExpired?: boolean;
  emailIdVerified?: boolean;
  mobileNoVerified?: boolean;
  accountNonLocked?: boolean;
  accountNonExpired?: boolean;
  permissions?: string[]; // replaces all permissions
  roles?: string[]; // replaces all roles
}

// Self user info (GET /api/v1/users/me/info)
export interface UserInfo {
  username: string;
  emailId: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string | null;
  mobileNo?: string;
  permissions: string[];
  roles?: string[];
  enabled: boolean;
  accountNonLocked: boolean;
  accountNonExpired: boolean;
  credentialsNonExpired: boolean;
  emailIdVerified: boolean;
  mobileNoVerified: boolean;
  promptChangePassword: boolean;
}

// Self update (PATCH /api/v1/users/me/update-profile)
export interface SelfUpdateReq {
  emailId?: string;
  firstName?: string;
  lastName?: string;
  mobileNo?: string;
  profilePicture?: string | null;
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
    isFirst?: boolean;
    isLast?: boolean;
    header?: string;
  };
}

export interface UsersFilter {
  phrases?: string[];
  roles?: string[];
  permissions?: string[];
  enabled?: boolean;
  credentialsExpired?: boolean;
  emailIdVerified?: boolean;
  mobileNoVerified?: boolean;
  page?: number;
  size?: number;
  sort?: string[];
  expand?: ('permissions' | 'roles' | 'role-permissions' | '*')[];
}

// GET /api/v1/users/summary
export interface UserSummary {
  username: string;
  emailId: string;
  mobileNo?: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  enabled: boolean;
}

export const usersApi = {
  /** GET /api/v1/users/summary — lightweight user search by phrase, for pickers.
   *  Up to 5 phrases, each at most 15 chars. */
  getUserSummaries: async (phrases: string[]): Promise<UserSummary[]> => {
    const response = await apiClient.get<UserSummary[]>('/api/v1/users/summary', {
      params: phrases.length ? { phrases } : undefined,
    });
    return response.data;
  },
  /** Fetches info for the currently logged-in user (session-derived, no id needed). */
  getSelfInfo: async (): Promise<UserInfo> => {
    const response = await apiClient.get<UserInfo>('/api/v1/users/me/info');
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
  getUsers: async (filter: UsersFilter = {}): Promise<PaginatedUsers> => {
    const {
      phrases,
      roles,
      permissions,
      enabled,
      credentialsExpired,
      emailIdVerified,
      mobileNoVerified,
      page = 0,
      size = 20,
      sort,
      expand,
    } = filter;
    const response = await apiClient.get<PaginatedUsers>('/api/v1/users', {
      params: {
        page,
        size,
        ...(phrases?.length ? { phrases } : {}),
        ...(roles?.length ? { roles } : {}),
        ...(permissions?.length ? { permissions } : {}),
        ...(enabled !== undefined ? { enabled } : {}),
        ...(credentialsExpired !== undefined ? { credentialsExpired } : {}),
        ...(emailIdVerified !== undefined ? { emailIdVerified } : {}),
        ...(mobileNoVerified !== undefined ? { mobileNoVerified } : {}),
        ...(sort?.length ? { sort } : {}),
      },
      headers: expand?.length ? { 'x-expand': expand.join(',') } : undefined,
    });
    return response.data;
  },
  createUser: async (data: UserCreationReq): Promise<void> => {
    await apiClient.post('/api/v1/users', data);
  },
  getUserById: async (
    id: string,
    expand?: ('permissions' | 'roles' | 'role-permissions' | '*')[],
  ): Promise<UserDetailVM> => {
    const response = await apiClient.get(`/api/v1/users/${id}`, {
      headers: expand?.length ? { 'x-expand': expand.join(',') } : undefined,
    });
    return response.data;
  },
  updateUser: async (id: string, data: UserUpdateReq): Promise<void> => {
    await apiClient.patch(`/api/v1/users/${id}`, data);
  },
  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/users/${id}`);
  },
  resetPassword: async (id: string): Promise<void> => {
    await apiClient.patch(`/api/v1/users/${id}/reset-password`);
  },
  updateSelf: async (data: SelfUpdateReq): Promise<void> => {
    await apiClient.patch('/api/v1/users/me/update-profile', data);
  },
};
