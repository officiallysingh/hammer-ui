import { apiClient } from './client';

export interface UserDetailVM {
  id: string;
  username: string;
  email?: string;
  mobileNo?: string;
  firstName?: string;
  lastName?: string;
  active?: boolean;
  emailVerified?: boolean;
  mobileVerified?: boolean;
  authorities?: { id: string; name: string }[];
}

/** Response from GET /api/v1/users/username/{loginName}/info */
export interface UserInfo {
  username: string;
  emailId: string;
  firstName: string;
  lastName: string;
  mobileNo: string;
  authorities: string[];
  enabled: boolean;
  accountNonLocked: boolean;
  accountNonExpired: boolean;
  credentialsNonExpired: boolean;
  emailIdVerified: boolean;
  mobileNoVerified: boolean;
  promptChangePassword: boolean;
}

export const usersApi = {
  /** Get user info by login name (username, email, or mobile). Use after login with session. */
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
  getUsers: async (
    page = 0,
    size = 20,
  ): Promise<{ content?: UserDetailVM[]; data?: UserDetailVM[] } | UserDetailVM[]> => {
    const response = await apiClient.get('/api/v1/users', { params: { page, size } });
    return response.data;
  },
  getUserById: async (id: string): Promise<UserDetailVM> => {
    const response = await apiClient.get(`/api/v1/users/${id}`);
    return response.data;
  },
  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/users/${id}`);
  },
};
